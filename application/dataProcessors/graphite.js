const http = require('../infra/http')
const logger = require('../infra/logger')
const config = require('../config')
const defaultPeriod = '-1d'
const targets = {
  uvcs: {
    count: 'stats.ucp.analytics.uvcs.connection.count',
    total_duration: 'stats.timers.ucp.analytics.uvcs.total.duration.mean',
    after_mfa_duration: 'stats.timers.ucp.analytics.uvcs.after_mfa.duration.mean',
    worker_duration: 'stats.timers.ucp.analytics.uvcs.worker.duration.mean',
  }
}

async function get(url){
  const ret = await http.wget(`${config.GraphiteEndpoint}/${url}`);
  return ret;
}

const performanceDecimal = 0
function calculatePeformance(timings, counts){
  if(timings && timings?.length === counts?.length){
    let total_duration = 0, 
        total_count = 0;
        min = 9999999;
        max = 0;
        cur = 0;
    for(let i = 0; i < timings?.length; i++){
      let count = counts[i][0];
      if(count > 0){
        cur = timings[i][0];
        total_count += count;
        total_duration += cur * count;
        min = Math.min(min, cur);
        max = Math.max(max, cur);
      }
    }
    if(total_count > 0){
      return {
        min: (min / 1000).toFixed(performanceDecimal),
        max: (max / 1000).toFixed(performanceDecimal),
        cur: (cur / 1000).toFixed(performanceDecimal),
        avg: (total_duration / total_count / 1000).toFixed(performanceDecimal)
      };
    }
  }
  return {}
}

function calculateSuccessRate(succeeded, failed){
  if(succeeded?.length === failed?.length){
    let total_succeeded = 0, 
        total_count = 0;
        min = 100;
        max = 0;
        cur = 0;
    for(let i = 0; i < succeeded.length; i++){
      let failed_count = failed[i][0];
      let succeeded_count = succeeded[i][0];
      let sub_total = failed_count + succeeded_count;
      total_count += sub_total;
      total_succeeded += succeeded_count;
      if(sub_total > 0){
        cur = succeeded_count * 100.0 / (sub_total)
        min = Math.min(min, cur);
        max = Math.max(max, cur);
      }
    }
    if(total_count > 0){
      return {
        min: min.toFixed(2),
        max: max.toFixed(2),
        cur: cur.toFixed(2),
        avg: (total_succeeded * 100.0/ total_count).toFixed(2)
      };
    }
  }
  return {}
}

// job_status, fi
// env, provider, institution, succeeded
const ex = {
  uvcs: {
    async get_providers(){
      const ret = await get(`tags/provider`);
      return ret?.values?.map(v => v.value) || [];
    },
    async get_performance(provider, institution, jobType = 'agg', period = defaultPeriod, timeshift){
      const url = [
        `seriesByTag('name=${targets.uvcs.count}', 'env=${config.Env}', 'provider=${provider}','institution=${institution}','mode=${jobType}')`,
        timeshift ? `|timeShift('${timeshift}d')` : '',
        `|groupByTags('sum','succeeded')`,
        // `|sumSeries()`,
        `&format=json&from=${period}`
      ].join('');
      let ret = await get(`render?target=${url}`);
      if(ret && ret.length === 2){
        let s = ret.find(t => t.tags.succeeded === 'true')
        let f = ret.find(t => t.tags.succeeded !== 'true')
        return calculateSuccessRate(s.datapoints, f.datapoints)
      }
      return {}
    },
    async get_success_rate(provider, institution, jobType = 'agg', period = defaultPeriod, timeshift){
      const filter = `'env=${config.Env}', 'provider=${provider}', 'institution=${institution}', 'succeeded=true','mode=${jobType}'`
      let url = [
        // `weightedAverage(`,
        `seriesByTag('name=${targets.uvcs.worker_duration}',${filter})`,
        // `,`,
        // `seriesByTag('name=${targets.uvcs.count}','fi=${institution}', 'job_status=well')`,
        // `)`,
        // `|groupByTags('sum','job_type')`,
        timeshift ? `|timeShift('${timeshift}d')` : '',
        `|averageSeries()`,
        `&format=json&from=${period}`
      ].join('');
      let timings = await get(`render?target=${url}`);
      url = [
        `seriesByTag('name=${targets.uvcs.count}',${filter})`,
        timeshift ? `|timeShift('${timeshift}d')` : '',
        `|sumSeries()`,
        `&format=json&from=${period}`
      ].join('');
      let counts = await get(`render?target=${url}`);
      return calculatePeformance(timings?.[0]?.datapoints, counts?.[0]?.datapoints)
    }
  },
  defaultPeriod
}

// ex.jobs.get_performance('cibc_online')

module.exports = ex