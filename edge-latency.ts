import { Pool, neonConfig } from '@neondatabase/serverless';

const dataError = () => new Response('Expected a POSTed JSON object like { "trials": 1, "database": "postgres://...", "pipelineConnect": "password" }', { status: 400 });

export default async (req: Request, ctx: any) => {
  // parse POSTed JSON
  let json: any;
  try { json = await req.json(); }
  catch (err) { return dataError(); }

  // validate POSTed JSON values
  const { database, trials, pipelineConnect } = json;
  if (
    typeof trials !== 'number' ||
    typeof database !== 'string' ||
    !/^\s*postgres(ql)?:/.test(database)
  ) return dataError();

  // set parameters
  const connectionString = database.trim();
  const count = trials < 1 ? 1 : trials > 21 ? 21 : trials;
  const durations = new Array(count);
  const results = new Array(count);
  neonConfig.pipelineConnect = pipelineConnect;

  // get location
  const location = {
   city: req.headers.get('x-vercel-ip-city'),
   longitude: parseFloat(req.headers.get('x-vercel-ip-longitude')),
   latitude: parseFloat(req.headers.get('x-vercel-ip-latitude')),
  };

  // do the connection trials
  try {
    for (let i = 0; i < count; i++) {
      const t0 = Date.now();
      const pool = new Pool({ connectionString });
      const { rows: [{ now }] } = await pool.query('SELECT now()');
      durations[i] = Date.now() - t0;
      results[i] = now;
      ctx.waitUntil(pool.end());
    }
    return new Response(JSON.stringify({ durations, results, location }));

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
