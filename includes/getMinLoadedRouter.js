import debug from './debug.js';

export default function (availableRoutes) {
  let minRouter = availableRoutes.pop();
  let totalCPU = {
    cpu: 0,
    loadavg: 0,
  };
  if (minRouter.metrics) {
    totalCPU = minRouter.metrics.reduce(function (a, b) {
      return {
        cpu: parseFloat(a.cpu) + parseFloat(b.cpu) + a.loadavg[0] + b.loadavg[0],
        loadavg: [0],
      };
    });
  }
  minRouter.cpu = totalCPU.cpu;
  debug.debug('MinRouter %O', minRouter);
  for (let i in availableRoutes) {
    let totalCPU = {
      cpu: 0,
      loadavg: 0,
    };
    if (availableRoutes[i].metrics) {
      totalCPU = availableRoutes[i].metrics.reduce(function (a, b) {
        return {
          cpu: parseFloat(a.cpu) + parseFloat(b.cpu) + a.loadavg[0] + b.loadavg[0],
          loadavg: [0],
        };
      });
    }
    availableRoutes[i].cpu = totalCPU.cpu;
    if (availableRoutes[i].cpu < minRouter.cpu) {
      minRouter = availableRoutes[i];
    }
    debug.debug('MinRouter %O', minRouter);
    debug.debug('availableRoutes %s %O', i, availableRoutes[i]);
  }
  return minRouter;
}
