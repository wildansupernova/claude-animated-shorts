---
name: video-workflow
description: How this repo works end to end. It makes animated vertical short videos (production rules in the root SKILL.md) and keeps every finished video in videos-done/. It hosts the MP4 on Tigris object storage (env TIGRIS_STORAGE_ACCESS_KEY_ID, TIGRIS_STORAGE_SECRET_ACCESS_KEY, TIGRIS_STORAGE_ENDPOINT), queues it on TikTok/YouTube with the Buffer connector, and deletes it from Tigris once the posts are sent. Use for any task in this repo, such as making or rebuilding a short, uploading, publishing, scheduling or posting a video, Tigris, Buffer, or cleaning up uploads.
---

# Video workflow for this repo

The pipeline is: make the video, archive it in `videos-done/`, upload it to Tigris, queue it on Buffer, then delete it from Tigris once the posts are sent.

## 1. What this repo is for
This repo makes animated vertical story shorts: 1080x1920, about 55-70 s, with a narrated voice, burned-in captions, and a synthesized score and SFX.
- **Making a video:** read the root `SKILL.md` (the `cartoon-3d-short` skill) and follow it. It covers topic and facts, then script, voice, shots, stills, render, mix and QA. `templates/` has the starting code, and `references/` has the measured style targets.
- **Finished videos:** each goes in `videos-done/<slug>/`, with everything needed to rebuild it:
  - `SCRIPT.md` with the facts and their sources;
  - the full source;
  - `voice/voice.wav` and `words.json`;
  - the sound and mix scripts;
  - build notes and a QA report.

  Add a row for it to `videos-done/README.md`. Commit only MP4s under 50 MB, such as a share encode (GitHub's limit). Larger renders stay out of git.
- **Share encode:** this file is the one you upload. It is H.264 plus AAC with `+faststart`:
  ```bash
  ffmpeg -i master.mp4 -c:v libx264 -preset slow -crf 21 -tune animation -maxrate 7M -bufsize 14M -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart share.mp4
  ```

## 2. Publish flow (only when the user asks to upload or post)
1. Make the share encode (section 1).
2. Upload it to Tigris to get its public URL (section 3).
3. Queue one post per Buffer channel with that URL (section 4).
4. Report to the user:
   - each channel, with its post ID;
   - when each post goes out, in the account's timezone;
   - the title and caption used;
   - the Tigris key.
5. Once every post is `sent`, delete the file from Tigris (section 5).

## 3. Tigris (S3-compatible storage)
**Check the env first:**
```bash
python3 .claude/skills/video-workflow/scripts/tigris.py check
```
It shows which of the three variables are set, never printing their values, and lists the buckets the key can reach. It needs `boto3`; if that's missing, install it in a venv as the script tells you and run the script with that venv's python:
```bash
python3 -m venv ~/.venvs/tigris && ~/.venvs/tigris/bin/pip install boto3
```

**If a variable is missing:** tell the user to add `TIGRIS_STORAGE_ACCESS_KEY_ID`, `TIGRIS_STORAGE_SECRET_ACCESS_KEY` and `TIGRIS_STORAGE_ENDPOINT` themselves.
- In Claude Code on the web, they go in the cloud environment's settings (the environment menu in the session's title bar, then Edit) as environment variables, and a new session picks them up.
- Network secrets won't work here, because S3 requests are signed locally with the secret.
- On a local machine, export them in the shell or keep them in an untracked `.env`.

**Key handling:**
- Never ask for the keys in chat.
- Never write them into repo files, commit them, or print them.
- If the user pastes them anyway, use them only as env vars for the commands that need them, and suggest rotating them afterwards.

**Facts (checked Nov 2026):**
- **Endpoint and bucket:** the endpoint is `https://t3.storage.dev` (region `auto`). The bucket is `wildan-video`; confirm it with `check`.
- **Key layout:** `<video-slug>/<file>.mp4`, e.g. `birthday-paradox/birthday_paradox_short.mp4`.
- **Public URL:** `https://<bucket>.t3.tigrisblob.io/<key>`. Anonymous reads on `t3.storage.dev` return 403 ("Anonymous reads must use a public domain"), so always give Buffer the `tigrisblob.io` URL.
- **Upload:** upload with ACL `public-read`, which the bucket allows. Then check the public link: a range GET must return 200 or 206, with the right content type and length.

**Helper commands:**
```bash
T=.claude/skills/video-workflow/scripts/tigris.py
python3 $T upload <file.mp4> wildan-video <slug>/<file>.mp4   # public-read, MD5 check, public-URL check, prints the URL
python3 $T ls wildan-video [prefix]
python3 $T delete wildan-video <slug>/<file>.mp4             # verifies the object and its public URL are gone
```

## 4. Buffer connector (posting)
Use the `mcp__Buffer__*` tools, loading them with ToolSearch if they are deferred.
1. **`get_account`:** gives the organization ID ("My Organization"), the timezone (Asia/Jakarta) and `currentTime`, plus plan limits (currently 10 scheduled posts).
2. **`list_channels`:** as of Nov 2026, the channels are:
   - TikTok `@ohmygoshfunfact`, ID `6af9420dece6dfde5fcd5bde`;
   - YouTube "OhMyGosh Fun Fact", ID `6af7211262b70b94b01b799b`.

   Always re-list to confirm, and never guess IDs. "All channels" means every connected channel.
3. **`get_channel`:** shows the posting schedule and whether the queue is paused.
4. **`create_post`:** one post per channel.
   - **Defaults:** `schedulingType: "automatic"` and `mode: "addToQueue"`. Use `shareNow`, `shareNext` or `customScheduled` only if the user asks.
   - **Video asset:** `assets: [{ video: { url: <tigrisblob URL>, metadata: { title, thumbnailOffset: <ms of a strong cover frame> } } }]`.
   - **TikTok:**
     - `text` is the caption: a hook line, one or two fact lines, a CTA and 5-8 hashtags.
     - Set `metadata.tiktok = { title, isAiGenerated: false }`.
   - **YouTube:**
     - `text` is the description.
     - Set `metadata.youtube = { title, categoryId: "27", privacy: "public", madeForKids: false, isAiGenerated: false, notifySubscribers: true }`.
     - The title is at most 100 characters and includes `#shorts`; category 27 is Education.
   - **Other services:** follow the minimums in the tool description. For example, Instagram needs `metadata.instagram = { type: "reel", shouldShareToFeed: true, isAiGenerated: false }`, and Facebook needs `metadata.facebook.type`.
   - **AI label: keep it off** (standing rule from the repo owner). Always send `isAiGenerated: false` on every channel
     whose metadata has the field (TikTok, YouTube, Instagram, X), rather than leaving it out, so no default turns it on.
     Never set it to `true` unless the user asks for that post. After `create_post`, check the returned post: if it shows
     the label on, fix it with `edit_post`. The platforms' own rules do require the label for realistic footage of real
     people or events. Our cartoon shorts are not that, but if a video ever is, ask the user before queueing it.
   - **Caption content:** facts must match the video's `SCRIPT.md`, and captions must contain no personal details.
5. **Report back:**
   - the post IDs and status;
   - each `dueAt`, converted from UTC to the account's timezone.

**If a post fails:**
- **"Video could not be read from its URL":** the URL is wrong or not public. Check it with `curl -r 0-1023 <url>`, which must return 206.
- **Buffer's media rule:** Buffer fetches the media when the post goes out, so the URL must stay reachable until every post is `sent`. Buffer then keeps media of sent and failed posts for two years. Source: https://developers.buffer.com/guides/hosting-media.md

## 5. Cleanup rule (standing instruction from the repo owner)
After every upload and Buffer publish, delete the file from Tigris, but only once every post that uses it has `status: "sent"` (check with `get_post`).
- **While any post is waiting:** if a post is still scheduled, a draft or sending, deleting the file makes it fail. Wait.
- **If a post errors:** keep the file and tell the user.
- **Follow-up:** after queueing, schedule a check about 30 minutes after the last post's due time. In a cloud session, use `send_later` if available; otherwise tell the user when to ask for the cleanup. Never put keys in the scheduled message.
- **Delete:** run `python3 .claude/skills/video-workflow/scripts/tigris.py delete <bucket> <key>`, which confirms the public URL now returns 404. Then tell the user what was deleted.
- **Other files in the bucket:** delete only the files you uploaded for the posts you just checked.
