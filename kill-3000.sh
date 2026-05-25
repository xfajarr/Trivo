#!/bin/bash
# Kill whatever is running on port 3000
fuser -k 3000/tcp 2>/dev/null && echo "Killed process on port 3000" || echo "Port 3000 was already free"
