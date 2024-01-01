const Lynx = require('lynx');
const config = require('../../config');
const logger = require('../../infra/logger')

function getMetricsStr(key, tags){
  tags = tags || {};
  tags.env = config.Env;
  tags.service = config.Component;//.replace(/-/g,'.');
  tags.version = config.Version;
  return `${config.Component.replace(/-/g,'.')}.${key};` + Object.keys(tags).map(k => `${k}=${tags[k]}`).join(';');
}

var cachedClient;
function client() {
  return cachedClient || (cachedClient = ( config.Env === 'mocked'? 
    {
        increment(key){
          console.log(key)
        },
        timing(key, duration){
            console.log(key + ':' + duration);
        }
    }
    : new Lynx(config.StatsDHost, config.StatsDPort, {on_error: function(e){
        logger.error('statsd error: ', e)
    }})));
}

module.exports = {
    increment(key, tags){
        client().increment(getMetricsStr(key, tags));
    },
    timing(key, duration, tags){
      client().timing(getMetricsStr(key, tags), duration);
    },
    expressStatsd (req, res, next) {
    var startTime = new Date().getTime();
    function sendStats(){
      let path = req.metricsPath || (req.route || {}).path || req.path || '';
      let tags = {
        status:res.statusCode,
        path: path.replace(/:/g, '-'),
        method: req.method
      };
      let str = getMetricsStr('inbound', tags);
      client().increment(str);
      let duration = new Date().getTime() - startTime;
      client().timing(getMetricsStr('inbound.duration', tags), duration);
      cleanup();
    }

    function cleanup() {
      res.removeListener('finish', sendStats);
      res.removeListener('error', cleanup);
      res.removeListener('close', cleanup);
    }

    res.once('finish', sendStats);
    res.once('error', cleanup);
    res.once('close', cleanup);

    if (next) {
      next();
    }
  }
}