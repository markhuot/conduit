import type { RequestContext } from '../../lib/router/types';
import { json } from '../../lib/router/response';

/**
 * Homepage handler
 * Returns basic API information
 */
export default async function home(ctx: RequestContext): Promise<Response> {
  return json({
    name: 'Project Conduit',
    version: '0.1.0',
    description: 'Event-sourced CMS for LLM-native workflows',
    routes: {
      home: '/',
      // Future routes will be listed here
    },
  });
}
