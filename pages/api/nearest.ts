import handler from '../../edge-latency';

export const config = {
  runtime: 'edge',
  // nearest region
};

export default async (req: Request, ctx: any) => handler(req, ctx);
