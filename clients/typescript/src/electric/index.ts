import { ElectricConfig, hydrateConfig } from '../config/index'
import { DatabaseAdapter } from './adapter'
import { BundleMigrator, Migrator } from '../migrators/index'
import { EventNotifier, Notifier } from '../notifiers/index'
import { globalRegistry, Registry } from '../satellite/index'
import { SocketFactory } from '../sockets/index'
import { DbName } from '../util/types'
import { tracer } from '../util/tracer'
import { setLogLevel } from '../util/debug'
import { ElectricNamespace } from './namespace'
import { ElectricClient } from '../client/model/client'
import { DbSchema } from '../client/model/schema'

import api from '@opentelemetry/api'
export const tracer = api.trace.getTracer(`electric-client`)

export { ElectricNamespace }
export type * from './adapter'

// These are the options that should be provided to the adapter's electrify
// entrypoint. They are all optional to optionally allow different / mock
// implementations to be passed in to facilitate testing.
export interface ElectrifyOptions {
  adapter?: DatabaseAdapter
  migrator?: Migrator
  notifier?: Notifier
  socketFactory?: SocketFactory
  registry?: Registry
  /**
   * Function that prepares the database connection.
   * If not overridden, the default prepare function
   * enables the `foreign_key` pragma on the DB connection.
   * @param connection The database connection.
   * @returns A promise that resolves when the database connection is prepared.
   */
  prepare?: (connection: DatabaseAdapter) => Promise<void>
}

const defaultPrepare = async (connection: DatabaseAdapter) => {
  await connection.run({ sql: 'PRAGMA foreign_keys = ON;' })
}

/**
 * This is the primary `electrify()` endpoint that the individual drivers
 * call once they've constructed their implementations. This function can
 * also be called directly by tests that don't want to go via the adapter
 * entrypoints in order to avoid loading the environment dependencies.
 */
export const electrify = async <DB extends DbSchema<any>>(
  dbName: DbName,
  dbDescription: DB,
  adapter: DatabaseAdapter,
  socketFactory: SocketFactory,
  config: ElectricConfig = {},
  opts?: Omit<ElectrifyOptions, 'adapter' | 'socketFactory'>
): Promise<ElectricClient<DB>> => {
  const constructorSpan = tracer.startSpan(`electric.constructor`)
  setLogLevel(config.debug ? 'TRACE' : 'WARN')
  const prepare = opts?.prepare ?? defaultPrepare
  const prepareSpan = tracer.startSpan(
    'electric.constructor.prepareSpan',
    undefined,
    api.trace.setSpan(api.context.active(), constructorSpan)
  )
  await prepare(adapter)
  prepareSpan.end()

  const configWithDefaults = hydrateConfig(config)
  const migrator =
    opts?.migrator || new BundleMigrator(adapter, dbDescription.migrations)
  const notifier = opts?.notifier || new EventNotifier(dbName)
  const registry = opts?.registry || globalRegistry

  const ensureStartedSpan = tracer.startSpan(
    'electric.constructor.ensureStarted',
    undefined,
    api.trace.setSpan(api.context.active(), constructorSpan)
  )
  const satellite = await registry.ensureStarted(
    dbName,
    dbDescription,
    adapter,
    migrator,
    notifier,
    socketFactory,
    configWithDefaults,
    ensureStartedSpan,
  )
  ensureStartedSpan.end()

  const electric = ElectricClient.create(
    dbName,
    dbDescription,
    adapter,
    notifier,
    satellite,
    registry
  )

  if (satellite.connectivityState !== undefined) {
    electric.setIsConnected(satellite.connectivityState)
  }
  constructorSpan.end()

  return electric
}
