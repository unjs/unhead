export * from './dist/webworker'

declare module 'web-worker:*' {
  const WorkerFactory: new () => Worker
  export default WorkerFactory
}
