# Postgres

## Getting a dump of the data from Heroku

```sh
cd docker

heroku pg:backups:capture HEROKU_POSTGRESQL_BLUE
```

## Initiating the auth-server database

```sh
# Find the running instance of postgres

docker container list -f name=db

# and SSH into the box using the 'CONTAINER_ID'

docker_ssh d4a3a339ffdf

# Updating the database from the latest.dump file

cd docker-entrypoint-initdb.d

pg_restore --verbose --clean --no-acl --no-owner -h localhost -U postgres -d auth-server latest.dump
```

## Validate the new database `auth-server`

```sh
psql -U postgres

# List databases
postgres=# \l

# Choose database
postgres=# \c auth-server
You are now connected to database "auth-server" as user "postgres".
auth-server=# \dt
            List of relations
 Schema |    Name     | Type  |  Owner   
--------+-------------+-------+----------
 public | apps        | table | postgres
 public | client_apps | table | postgres
 public | users       | table | postgres
(3 rows)

```


