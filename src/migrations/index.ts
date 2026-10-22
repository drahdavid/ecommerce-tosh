import * as migration_20261016_195058_initial from './20261016_195058_initial';
import * as migration_20261016_235309_pending_orders_limit from './20261016_235309_pending_orders_limit';
import * as migration_20261021_231558_store_name_default from './20261021_231558_store_name_default';

export const migrations = [
  {
    up: migration_20261016_195058_initial.up,
    down: migration_20261016_195058_initial.down,
    name: '20261016_195058_initial',
  },
  {
    up: migration_20261016_235309_pending_orders_limit.up,
    down: migration_20261016_235309_pending_orders_limit.down,
    name: '20261016_235309_pending_orders_limit',
  },
  {
    up: migration_20261021_231558_store_name_default.up,
    down: migration_20261021_231558_store_name_default.down,
    name: '20261021_231558_store_name_default'
  },
];
