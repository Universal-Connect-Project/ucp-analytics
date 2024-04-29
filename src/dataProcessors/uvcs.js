const session_start = [
  'Enter Credentials - End (Submitted)',
  'OAuth - Start',
]

const session_end = [
  'Success  - Status CONNECTED',
  // 'Status  - CONNECTED',
  'Status  - FAILED',
  'Status  - REJECTED',
  'OAuth - Cancel',
  'OAuth - End',
  'Status  - EXPIRED',
  'Login Error - Try Refreshing'
]

const session_success = [
  'Success  - Status CONNECTED',
  'OAuth - End',
]

const session_mfa_start = [
  'MFA - Options - Start'
]

const session_mfa_end = [
  'MFA - Options - End',
]

function getTags(event, parsedSoFar){
  let ret = {
    institution: parsedSoFar?.institution || event.institution,
    provider: parsedSoFar?.provider || event.provider,
    mode: parsedSoFar?.mode || event.mode,
    oauth: parsedSoFar?.oauth || event.action?.startsWith('OAuth')
  };
  
  for ( k of Object.keys(ret)) {
    if (ret[k] === 'undefined') {
      ret[k] = undefined;
    }
    return ret;
  }
}

module.exports = {
  getTags,
  is_start_session(type, event){
    return type === 'analytics_event' && (session_start.indexOf(event.action) > -1)
  },
  is_valid_session(type, event){
    return type === 'analytics_event' && (session_end.indexOf(event.action) > -1)
  },
  parse_session(events){
    let start = 0, mfa_start = 0, mfa_end = 0, mfa_duration = 0, end = 0, succeeded = false;
    let mfa_count = 0;
    let tags;
    for(const e of events){
      // console.log(e)
      if( session_start.indexOf(e.action) > -1 ){
        start = e.created_at * 1000
        // console.log(`start: ${start}, ${e.action}`)
      }
      if(session_end.indexOf(e.action) > -1){
        end = e.created_at * 1000
        // console.log(`end: ${end}, ${e.action}`)
      }
      if(session_mfa_start.indexOf(e.action) > -1){
        mfa_count++;
        mfa_start = e.created_at * 1000;
      }
      if(session_mfa_end.indexOf(e.action) > -1){
        mfa_end = e.created_at * 1000;
        mfa_duration += (mfa_end - mfa_start);
      }
      tags = getTags(e, tags);
      succeeded = succeeded || session_success.indexOf(e.action) > -1;
    }
    return {
      mfa_count,
      working_duration: end - start - mfa_duration,
      total_duration: end - start,
      after_mfa_duration: end - (mfa_end || start),
      tags: {
        succeeded,
        ...tags
      }
    }
  }
}