const session_start = [
  'Enter Credentials - End (Submitted)'
]

const session_end = [
  'Success  - Status CONNECTED',
  // 'Status  - CONNECTED',
  'Status  - REJECTED'
]

const session_success = [
  'Success  - Status CONNECTED',
]

const session_mfa_start = [
  'MFA - Options - Start'
]
const session_mfa_end = [
  'MFA - Options - End',
]

module.exports = {
  is_valid_session(type, event){
    return type === 'analytics_event' && (session_end.indexOf(event.action) > -1)
  },
  parse_session(events){
    let start = 0, mfa_start = 0, mfa_end = 0, mfa_duration = 0, end = 0, succeeded = false, provider, institution;
    let mfa_count = 0;
    let mode;
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
      provider = provider || e.provider;
      mode = mode || e.mode;
      institution = institution || e.institution;
      succeeded = succeeded || session_success.indexOf(e.action) > -1;
    }
    return {
      mfa_count,
      working_duration: end - start - mfa_duration,
      total_duration: end - start,
      after_mfa_duration: end - (mfa_end || start),
      tags: {
        succeeded,
        institution,
        provider,
        mode
      }
    }
  }
}