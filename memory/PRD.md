# Central Inventory — PRD

## Original Problem Statement
Pull repo from `https://github.com/parth-mygenie/central_inventory.git` (branch `24_5_26_1`), explore the tech stack, and get it running as-is. No modifications or testing needed.

## Architecture
- **Backend**: FastAPI (Python) — acts as a proxy to `preprod.mygenie.online` APIs + seed data enrichment
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui (Radix) + craco build tool + react-router-dom v7
- **Database**: MongoDB via Motor (async driver) — used for status checks; main data is proxied from external API + seed data
- **Key Pattern**: Backend proxies all API calls to MyGenie preprod servers, enriching responses with local seed data for restaurant hierarchy, inventory transfers, pending queues, and history

## Tech Stack
- Python 3.11, FastAPI 0.110, Motor 3.3, Pydantic 2.x, httpx
- React 19, react-router-dom 7.5, axios, recharts, shadcn/ui (Radix), Tailwind 3.4, craco
- MongoDB (local)

## Core Features
- Login (proxied auth to MyGenie vendor API)
- Operations Hub dashboard
- Hierarchy Summary & Store Detail views
- Pending Queues (approval, receive, my requests)
- Transfer Detail view with status timeline
- History Ledger
- Direct Dispatch, Request Stock, Stock Adjustment, Wastage Entry forms
- Wastage Report

## User Personas (from seed data)
- Master store owner (abhishek@kalabahia.com → My Genie, ID=1)
- Central store owners (owner@democentral1.com → ID=781, owner@democentral2.com → ID=782)
- Franchise owners (owner@demofranchise1-4.com → IDs 783-786)

## What's Been Implemented
- [2025-05-24] Cloned repo, restored .env files, installed dependencies, started services — app running as-is

## Backlog
- No modifications requested

## Next Tasks
- Awaiting user instructions for any modifications or feature additions
