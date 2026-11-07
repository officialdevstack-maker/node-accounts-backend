// notifications/models/DatabaseNotification.ts
// Sequelize model behind the "database" channel (like Laravel's notifications table).
// Call initDatabaseNotification(sequelize) once at boot, before sending any database notification.
import {
  DataTypes,
  Model,
  Op,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from 'sequelize';

export class DatabaseNotification extends Model<
  InferAttributes<DatabaseNotification>,
  InferCreationAttributes<DatabaseNotification>
> {
  declare id: string;
  declare type: string;
  declare notifiableId: string;
  declare data: Record<string, unknown>;
  declare readAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static async forNotifiable(notifiableId: string | number, options: { unreadOnly?: boolean; limit?: number } = {}) {
    return this.findAll({
      where: {
        notifiableId: String(notifiableId),
        ...(options.unreadOnly ? { readAt: { [Op.is]: null } } : {}),
      },
      order: [['createdAt', 'DESC']],
      limit: options.limit ?? 50,
    });
  }

  static async unreadCount(notifiableId: string | number): Promise<number> {
    return this.count({ where: { notifiableId: String(notifiableId), readAt: { [Op.is]: null } } });
  }

  static async markAsRead(id: string, notifiableId: string | number): Promise<void> {
    await this.update(
      { readAt: new Date() },
      { where: { id, notifiableId: String(notifiableId), readAt: { [Op.is]: null } } },
    );
  }

  static async markAllAsRead(notifiableId: string | number): Promise<void> {
    await this.update(
      { readAt: new Date() },
      { where: { notifiableId: String(notifiableId), readAt: { [Op.is]: null } } },
    );
  }
}

export function initDatabaseNotification(sequelize: Sequelize) {
  DatabaseNotification.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true },
      type: { type: DataTypes.STRING(120), allowNull: false },
      notifiableId: { type: DataTypes.STRING(64), allowNull: false },
      data: { type: DataTypes.JSON, allowNull: false },
      readAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      tableName: 'notifications',
      underscored: true,
      timestamps: true,
      indexes: [{ fields: ['notifiable_id', 'read_at'] }],
    },
  );

  return DatabaseNotification;
}
