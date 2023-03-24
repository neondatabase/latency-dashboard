import handler from '../handler';

export const config = {
  runtime: 'edge',
  regions: ['cle1']
};

export default async (req: Request, ctx: any) => handler(req, ctx);
