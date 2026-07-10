#!/bin/bash

cd packages/server && bun link && cd ../..
cd packages/client && bun link && cd ../..
cd tests && bun link sleepy-serv sleepy-socket
