import handler from '../handler';

export const config = {
  runtime: 'edge',
  regions: ['bom1']
};

export default async (req: Request, ctx: any) => handler(req, ctx);
