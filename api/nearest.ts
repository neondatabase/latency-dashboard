import handler from '../handler';

export const config = {
  runtime: 'edge',
  // nearest region
};

export default async (req: Request, ctx: any) => handler(req, ctx);
