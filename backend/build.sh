#!/bin/bash
npm install
tsc 2>&1 | grep -v "TS5107" | grep -v "TS5101" || true
