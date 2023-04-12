import awsRegionData from '../data/aws-regions.json';

export function regionFromNeonUrl(urlStr: string) {
  try {
    if (!urlStr) return undefined;

    const { protocol } = new URL(urlStr);
    if (protocol !== 'postgres:' && protocol !== 'postgresql:') return false;

    // we now swap the protocol to http: so that `new URL()` will parse it fully
    const httpUrlStr = 'http:' + urlStr.substring(protocol.length);

    // extract the required components
    const { username, password, hostname, pathname } = new URL(httpUrlStr);

    const valid = username && password && hostname &&
      hostname.indexOf('.') > -1 && pathname && pathname !== '/';
    if (!valid) return false;

    const hostComponents = hostname.split('.');
    const awsRegion = hostComponents.find(component =>
      /^[a-z]+-[a-z]+-[0-9]+$/.test(component) && awsRegionData[component]);

    return awsRegion as keyof typeof awsRegionData ?? false;

  } catch (err) {
    return false;
  }
}
