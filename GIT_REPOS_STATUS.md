# Git status: FA, FE (app), BE (server)

**Folder layout:** You're in **FA** (full app) at `FASAplayer\FASAPlayer`. It contains:
- **app** → submodule pointing to **FE** (FESAPlayer) https://github.com/savvycodings/FESAPlayer
- **server** → submodule pointing to **BE** (BESAPlayer) https://github.com/savvycodings/BESAPlayer

---

## Current state (summary)

| Repo   | Location        | Remote (origin)     | Branch      | Status |
|--------|-----------------|---------------------|------------|--------|
| **FA** | `FASAPlayer`    | savvycodings/FASAPlayer | main       | 1 commit ahead of origin; untracked `MARKET_VALUE_AND_FIXES.md`; **server** shows "modified content" |
| **FE** | `FASAPlayer/app`| savvycodings/FESAPlayer  | **detached** at 2ce3358 | Clean working tree; not on `main` |
| **BE** | `FASAPlayer/server` | savvycodings/BESAPlayer | **detached** at 05871da | **Staged changes not committed**; not on `main` |

---

## What’s going on

### FA (main repo)
- **Branch:** main  
- **Compared to origin:** 1 commit ahead (`f5ea8d4` – "market api")  
- **Untracked:** `MARKET_VALUE_AND_FIXES.md`  
- **Modified:** `server` – git reports "modified content" because inside `server` you have **staged but uncommitted** changes.  
- **Submodule commits recorded in FA:**  
  - `app` → `2ce3358` (marketprice)  
  - `server` → `05871da` (init)  

So FA is ready to push one commit, but it will still list "modified: server" until the server submodule has no uncommitted/staged changes (or you commit inside server and then update FA’s reference to that new commit).

### FE (app submodule)
- **Branch:** detached HEAD at `2ce3358` ("marketprice")  
- **Working tree:** clean  
- **Remotes:** `main` is at `9c8c539`, `origin/main` at `ce376d1` ("update"). Your current commit `2ce3358` is not the same as `origin/main`.  

So your latest work is on the detached commit. To update the FE repo (FESAPlayer) on GitHub, you need to put that work on `main` and push (e.g. merge or reset `main` to include `2ce3358`, then push).

### BE (server submodule)
- **Branch:** detached HEAD at `05871da` ("init")  
- **Staged (not committed):**  
  - `src/db/index.ts`, `schema.ts`, migrations (0014), `_journal.json`  
  - `src/pokedata/cardLookup.ts`, `lookup.ts`, `client.ts`, `pokedataRouter.ts`  
  - `src/store/storeRouter.ts`  
- **Remotes:** `main` is at `058c7ee`, `origin/main` at `5bb083c` ("update"). Your current commit `05871da` is not the same as `origin/main`.  

So you have a local "init" commit plus more changes only staged. To update the BE repo (BESAPlayer) on GitHub, you need to commit these changes, get them onto `main`, and push.

---

## How to update all three repos to main

Do this in order: **BE (server) → FE (app) → FA**.

### 1. BE (server) – commit, put on main, push

```powershell
cd "c:\Users\user-pc\FASAplayer\FASAPlayer\server"

# Commit the staged changes (creates new commit on current detached HEAD)
git commit -m "Pokedata lookup, card_prices, collections enrichment"

# Create/update main to include this commit (e.g. move main here)
git branch -f main HEAD
git checkout main

# Push to GitHub (BE)
git push origin main
```

If you prefer to merge into existing main instead of forcing:

```powershell
git stash
git checkout main
git pull origin main
git stash pop
# resolve conflicts if any, then:
git add .
git commit -m "Pokedata lookup, card_prices, collections enrichment"
git push origin main
```

(Use the first approach if your real “source of truth” is the current detached commit plus the staged files.)

### 2. FE (app) – put current work on main, push

```powershell
cd "c:\Users\user-pc\FASAplayer\FASAPlayer\app"

# Put main on the same commit as your current work (2ce3358)
git branch -f main HEAD
git checkout main

# Push to GitHub (FE)
git push origin main
```

If you prefer to keep existing main and merge your work in:

```powershell
git checkout main
git pull origin main
git merge 2ce3358 -m "Merge market value and profile/price fixes"
git push origin main
```

### 3. FA – commit doc (optional), push

```powershell
cd "c:\Users\user-pc\FASAplayer\FASAPlayer"

# Optional: add the new doc and commit
git add MARKET_VALUE_AND_FIXES.md
git commit -m "Docs: market value fix and console fixes"

# If you committed new commits in server (BE), update FA’s pointer to the new server commit:
# cd server
# git log -1 --oneline   (copy the new commit hash)
# cd ..
# git add server
# git commit -m "Update server submodule to latest BE"

# Push FA to GitHub
git push origin main
```

After step 1, if `server`’s commit changed, run `git add server` in FA and commit that before pushing (as in the comment above).

---

## Quick reference

- **FA** = full app (this repo): `FASAplayer\FASAPlayer`, origin **FASAPlayer**.  
- **FE** = frontend only: **app** submodule, origin **FESAPlayer**.  
- **BE** = backend only: **server** submodule, origin **BESAPlayer**.  

Updating “all three repos to main” means:  
1) **BE:** commit in `server`, put that on `main`, `git push origin main`.  
2) **FE:** put `app`’s current commit on `main`, `git push origin main`.  
3) **FA:** optionally commit the new doc (and `server` submodule pointer if it changed), then `git push origin main`.
