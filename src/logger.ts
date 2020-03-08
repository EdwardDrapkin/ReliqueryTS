import { Signale } from 'signale';

const Logger = new Signale({
  scope: 'reliquery',
  // @ts-ignore
  logLevel: 'info',
  disabled: !process.env.RELIQUERY_DEBUG,
  types: {
    trace: {
      badge: '🦶',
      color: 'yellow',
      label: 'trace',
      // @ts-ignore
      logLevel: 'info',
    },
  },
});

Logger.config({ displayTimestamp: true });

export function subLogger(scope: string) {
  return Logger.scope('reliquery', scope);
}

export { Logger };
