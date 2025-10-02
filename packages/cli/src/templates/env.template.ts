interface DbConfig {
  dbType: string;
  dbName?: string;
  dbHost?: string;
  dbPort?: string;
  dbUser?: string;
  dbPassword?: string;
}

export function getEnvTemplate(config: DbConfig): string {
  const { dbType, dbName, dbHost, dbPort, dbUser, dbPassword } = config;

  let databaseUrl = '';

  switch (dbType) {
    case 'postgresql':
      databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;
      break;
    case 'mysql':
      databaseUrl = `mysql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
      break;
    case 'sqlite':
      databaseUrl = 'file:./dev.db';
      break;
    case 'mongodb':
      databaseUrl = `mongodb://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?authSource=admin`;
      break;
    case 'sqlserver':
      databaseUrl = `sqlserver://${dbHost}:${dbPort};database=${dbName};user=${dbUser};password=${dbPassword};encrypt=true`;
      break;
    default:
      databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;
  }

  return `# Database Configuration
DATABASE_URL="${databaseUrl}"

# Note: Never commit this file to version control!
# Add .env to your .gitignore file
`;
}