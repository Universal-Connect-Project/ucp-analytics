const processEnv = {};
const envs = {...process.env, ...process.client_envs};
Object.keys(envs).forEach((k) => {
  processEnv[k.toUpperCase()] = envs[k];
});
const config = {
  LogLevel: 'debug',
  Port: '8081',
  Env: 'dev', //mocked, dev
  Component: 'ucp-analytics',
  Version: 'dev',
  StatsDHost: 'graphite.universalconnectproject.org',
  StatsDPort: '8125',
  SupportedComponents: 'universal_widget,tbdex_widget,widget,uvcs',
  AuthServiceEndpoint: 'https://login.universalconnectproject.org/api',
  GraphiteEndpoint: 'https://statsd.universalconnectproject.org',
  RefreshMockData: true,
  AwsRegion: 'us-west-2',
  S3Bucket: 'dev.universalconnectproject.org',
};

const arr = Object.keys(config);
for (let i = 0; i < arr.length; i++) {
  const key = arr[i];
  config[key] = processEnv[key.toUpperCase()] || config[key];
}
module.exports = config;