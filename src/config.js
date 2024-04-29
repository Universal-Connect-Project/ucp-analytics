const processEnv = {};
const envs = {...process.env, ...process.client_envs};
Object.keys(envs).forEach((k) => {
  processEnv[k.toUpperCase()] = envs[k];
});

const nonSensitiveSharedConfig = {
  AuthServiceEndpoint: 'https://login.universalconnectproject.org/api',
  GraphiteEndpoint: 'https://statsd.universalconnectproject.org',
  Component: 'ucp-analytics',
  SupportedComponents: 'universal_widget,tbdex_widget,widget,uvcs',
  StatsDHost: 'graphite.universalconnectproject.org',
  StatsDPort: '8125',
  AwsRegion: 'us-west-2',
  S3Bucket: 'dev.universalconnectproject.org',
}

const keysToPullFromEnv = [
  'LogLevel',
  'Port',
  'Env',
  'Version',
  'StatsDHost',
  'StatsDPort',
  'RefreshMockData'
]

const config = keysToPullFromEnv.reduce((acc, envKey) => {
  return {
    ...acc,
    [envKey]: processEnv[envKey.toUpperCase()]
  }
}, {
  ...nonSensitiveSharedConfig
})

module.exports = config;