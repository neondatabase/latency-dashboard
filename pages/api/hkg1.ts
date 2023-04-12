import handler from '../../edge-latency';

export const config = {
  runtime: 'edge',
  regions: ['hkg1']
};

export default async (req: Request, ctx: any) => handler(req, ctx);
