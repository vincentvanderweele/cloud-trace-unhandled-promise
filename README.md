# cloud-trace-unhandled-promise

This repository contains a small reproducible example to showcase how [cloud-trace-nodejs](https://github.com/googleapis/cloud-trace-nodejs) causes unhandled promise rejections when used with Postgres and Express. When running Node with the recommended flag `--unhandled-rejections=strict`, these promise rejections take down the whole Node process.

This example reproduces [this bug report](https://github.com/googleapis/cloud-trace-nodejs/issues/1319) from the Cloud Trace repository.

## Running the example

1. Make sure a Postgres service is running. If you want to connect to an existing Postgres server, use the `host`, `port`, `user`, `password`, and `database` environment variables when running this example. Otherwise, start a new database server using docker with the default parameters:
    ```
    docker run --name postgres -e POSTGRES_DB=database -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
    ```

2. Install dependencies: `npm install`
3. Run the example: `npm start`
4. Trigger the unhandled promise rejection using a GET request: `curl localhost:3000/`

Example error:
```
/usr/src/app/node_modules/pg-protocol/dist/parser.js:287
        const message = name === 'notice' ? new messages_1.NoticeMessage(length, messageValue) : new messages_1.DatabaseError(messageValue, length, name);
                                                                                                 ^

error: duplicate key value violates unique constraint "dummy_name_key"
    at Parser.parseErrorMessage (/usr/src/app/node_modules/pg-protocol/dist/parser.js:287:98)
    at Parser.handlePacket (/usr/src/app/node_modules/pg-protocol/dist/parser.js:126:29)
    at Parser.parse (/usr/src/app/node_modules/pg-protocol/dist/parser.js:39:38)
    at Socket.<anonymous> (/usr/src/app/node_modules/pg-protocol/dist/index.js:11:42)
    at Socket.emit (node:events:390:28)
    at addChunk (node:internal/streams/readable:324:12)
    at readableAddChunk (node:internal/streams/readable:297:9)
    at Socket.Readable.push (node:internal/streams/readable:234:10)
    at TCP.onStreamRead (node:internal/stream_base_commons:199:23) {
  length: 193,
  severity: 'ERROR',
  code: '23505',
  detail: 'Key (name)=(John) already exists.',
  hint: undefined,
  position: undefined,
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: 'public',
  table: 'dummy',
  column: undefined,
  dataType: undefined,
  constraint: 'dummy_name_key',
  file: 'nbtinsert.c',
  line: '663',
  routine: '_bt_check_unique'
}
```

## Short explanation

All code is in `index.js`, is relatively short, and contains some comments to describe what is happening. The main observations:

- This error can be reproduced with any database-level error. I used a unique column here because it is easy to force the query to fail.
- This error only occurs as an interplay between Cloud Trace, Express, and pg.
    - To showcase that this only happens in HTTP requests, I also trigger the conflict on server startup. That error gets handled properly.
    - Disabling (commenting out) tracing also fixes the issue.