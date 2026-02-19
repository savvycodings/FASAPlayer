# Clone FA and sync all 3 repos (FA, app, server)

**FA** = full app (FASAPlayer)  
**app** = frontend submodule (FESAPlayer)  
**server** = backend submodule (BESAPlayer)

---

## 1. Clone FA and get all 3 repos at once

Clone the main repo **with submodules** so you get `app` and `server` in one go:

```powershell
git clone --recurse-submodules https://github.com/savvycodings/FASAPlayer.git gradeit
cd gradeit
```

**If you already cloned without submodules**, run this once from the repo root:

```powershell
git submodule update --init --recursive
```

---

## 2. Update all 3 repos (pull latest)

**When someone else pushes to main** – run this from the **FA repo root** to get the latest FA, app, and server:

```powershell
cd c:\path\to\gradeit
git pull origin main
git submodule update --init --recursive
```

- `git pull origin main` updates the main repo (FA) to the latest `main`.
- `git submodule update --init --recursive` updates **app** and **server** to the commits that FA expects (what the other dev pushed).

**If you want submodules to follow their own latest `main`** (not just what FA pins):

```powershell
cd c:\path\to\gradeit
git pull origin main
git submodule update --remote --merge
```

- `--remote --merge` fetches each submodule's `origin/main` and merges it, so app and server are on the latest main from FESAPlayer and BESAPlayer.

**One-liner (stay in sync with what FA has):**

```powershell
cd c:\path\to\gradeit; git pull origin main; git submodule update --init --recursive
```

**One-liner (pull FA + submodules to their latest main):**

```powershell
cd c:\path\to\gradeit; git pull origin main; git submodule update --remote --merge
```

Replace `c:\path\to\gradeit` with your path (e.g. `c:\Users\user-pc\FASAplayer\FASAPlayer`).

---

## 3. Commit in all 3 repos (with messages) (after you've committed in FA, app, and/or server)

**Order:** Commit in **server** first, then **app**, then **FA**. FA records the submodule commit hashes.

**Commit all 3 with messages (copy-paste, then edit the messages):**

```powershell
cd c:\path\to\gradeit
cd server; git add .; git commit -m "Your server commit message"; cd ..
cd app; git add .; git commit -m "Your app commit message"; cd ..
git add app server; git commit -m "Update submodules: brief description"
```

**Or commit one by one:**

- Server: `cd server` → `git add .` → `git commit -m "Your message"`
- App: `cd app` → `git add .` → `git commit -m "Your message"`
- FA: `cd ..` (to repo root) → `git add app server` → `git commit -m "Update submodules: brief description"`

---

## 4. Push all 3 repos (after you've committed)

Push **server** and **app** first, then **FA**, so FA can point to the new submodule commits.

**Option A – Copy-paste block (PowerShell):**

```powershell
cd c:\path\to\gradeit
# Push server (BE), then app (FE), then FA
cd server; git push origin main; cd ..
cd app; git push origin main; cd ..
git push origin main
```

**Option B – One-liner:**

```powershell
cd c:\path\to\gradeit; cd server; git push origin main; cd ..; cd app; git push origin main; cd ..; git push origin main
```

Replace `c:\path\to\gradeit` with your actual path (e.g. `c:\Users\user-pc\FASAplayer\FASAPlayer`).

---

## 5. Full flow: Commit + push all 3 (copy-paste, then edit messages)

```powershell
cd c:\path\to\gradeit
# Commit server
cd server; git add .; git commit -m "Server: your message"; cd ..
# Commit app
cd app; git add .; git commit -m "App: your message"; cd ..
# Commit FA (records new app/server commits)
git add app server; git commit -m "FA: update submodules - your summary"
# Push all 3 (server, app, FA)
cd server; git push origin main; cd ..
cd app; git push origin main; cd ..
git push origin main
```

Use `git status` in each folder to see what changed; skip `git commit` in a repo if there's nothing to commit there.

---

## Quick reference

| Action | Command (from FA repo root) |
|--------|-----------------------------|
| **Clone all 3** | `git clone --recurse-submodules https://github.com/savvycodings/FASAPlayer.git gradeit` |
| **Update all 3 (when someone else pushed)** | `git pull origin main` then `git submodule update --init --recursive` |
| **Update all 3 (submodules to latest main)** | `git pull origin main` then `git submodule update --remote --merge` |
| **Commit all 3** | Commit in `server`, then `app`, then `git add app server` + commit in FA (each with a message). |
| **Push all 3** | Push `server`, then `app`, then `git push origin main` from repo root. |

---

## After clone: env files

- **app**: Copy or create `app/.env` (see project docs; not in git).
- **server**: Copy or create `server/.env` (see project docs; not in git).

Then run `pnpm install` in both `app` and `server` (or from repo root if you have a root script).
