#!/bin/bash

# Kill anything running on port 4293
lsof -ti:4293 | xargs kill -9 2>/dev/null

# Start the server on port 4293
PORT=4293 node server.mjs
