const logger = require('./infra/logger');
const http = require('./infra/http');
const config = require('./config')
const { randomUUID } = require('crypto')
const {parse_session, is_valid_session, is_start_session, getTags} = require('./dataProcessors/uvcs');
const { uvcs, defaultPeriod } = require('./dataProcessors/graphite')
const s3 = require('./utils/s3');
const statsd = require('./utils/statsd');

const compMap = {
  universal_widget: uvcs,
  uvcs
}

const s3Client = s3({
  region: config.AwsRegion,
  bucket: config.S3Bucket
})
const s3Prefix = `analytics/${config.Env}/`

function getDateSectionOfPath(d){
  d = new Date(d)
  return `${d.getFullYear()}-${d.getMonth() + 1}/${d.getDate()}`;
}

function isValidComponent(comp){
  return config.SupportedComponents.split(',').indexOf(comp) > -1;
}

async function auth(req){
  if(req.headers.authorization){
    const user = await http.get(`${config.AuthServiceEndpoint}/auth`, {Authorization: req.headers.authorization})
    return user;
  }
}

module.exports = function (app){
  app.post('/api/:component/analytics_*', async (req, res) => {
    const { component } = req.params;
    const user = await auth(req);
    if(!user?.id){
      logger.warning('Unauthorized user', req.headers)
      res.sendStatus(401)
      return
    }
    if(isValidComponent(component)){
      const type = Object.keys(req.body)?.[0]
      switch(type){
        case 'analytics_session':
          let id = randomUUID();
          logger.trace(`Starting a new analytics_session ${id}`)
          res.send({
            analytics_session:{
              guid: id,
              ...req.body.analytics_session,
            }
          });
          return;
        case 'analytics_event':
        case 'analytics_pageview':
          const session = req.body[type];
          const {session_id = 'no_session'} = session;
          const session_prefix = `${s3Prefix}${component}/${getDateSectionOfPath(new Date())}/${user.id}/${session_id}/${type}`
          const s3_key = `${session_prefix}/${new Date().toISOString()}.json`
          logger.debug(`Saving ${type} to s3, action: ${session.action}`, s3_key)
          await s3Client.PutObject(s3_key, JSON.stringify(session))
          if(is_start_session(type, session)){
            let tags = {
              client_id: user.id,
              ...getTags(session)
            }
            statsd.increment('uvcs.connection.start', tags)
          }
          if(is_valid_session(type, session)){
            let list = await s3Client.List(session_prefix);
            let events = await Promise.all(list.map(item => s3Client.GetObject(item.Key, true)))
            let ret = parse_session(events);
            logger.debug(`Recorded session ${session_id}`, ret)
            let tags = {
              client_id: user.id,
              ...ret.tags
            }
            statsd.timing('uvcs.total.duration', ret.total_duration, tags)
            statsd.timing('uvcs.after_mfa.duration', ret.after_mfa_duration, tags)
            statsd.timing('uvcs.worker.duration', ret.working_duration, tags)
            statsd.increment('uvcs.connection.count', tags)
            res.send(ret);
            return;
          }
          res.sendStatus(200)
          return;
      }
    }
    res.sendStatus(400)
  });
  app.get('/api/:institution/metrics/:component/:start/:end', async (req, res) => {
    const { institution, component, start, end } = req.params;
    if(isValidComponent(component) && institution){
      let client = compMap[component];
      let { job_type = 'aggregate', period = defaultPeriod } = req.query 
      const providers = await client.get_providers();
      const ret = {
        institution,
        metrics_source: component,
        providers: {}
      }
      for(let p of providers){
        const success_rate = await client.get_success_rate(p, institution, job_type, period)
        const time_cost = await client.get_performance(p, institution, period)
        ret.providers[p] = {
          success_rate,
          time_cost
        }
      }
      res.send(ret)
      return
    }
    res.sendStatus(400)
  });
}