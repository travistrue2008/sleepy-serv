# Sleepy Server

A web server designed for REST-ful applications

## Important Notes

- This package requires [`bun.sh`](https://bun.sh) instead of NodeJS to run.
- This project requires bun v1.2.3 which is currently in canary release

## How to Run the Local Example App

1. Install [`bun.sh`](https://bun.sh)
1. Link the library package:
    - `$ cd lib`
    - `$ bun link`
1. Link the library to the project
    - `$ cd ../example`
    - `$ npm link sleepy-serv`
1. Finally, run the app: `$ bun --watch run start`