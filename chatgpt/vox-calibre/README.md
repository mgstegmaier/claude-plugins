# Vox Calibre for ChatGPT

Vox Calibre is a focused, natural, plain-language writing style. It's precise, but with a human
voice. The precision rules are adapted from ASD-STE100 (the simplified technical English standard),
and the voice is influenced by the Microsoft and GOV.UK plain-language guides among many other
sources. Six entries in the banned list (binary contrasts, throat-clearing, intensifiers, vague
declaratives, false agency, and business jargon) are adapted from
[hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop) (MIT). ChatGPT uses short
everyday words, names the actor, puts numbers where adjectives would go, and defines terms where
they first appear.

This folder packages the style for ChatGPT, both in chat and in the documents it creates for you.

## Which version to use

| Your plan | Use |
|-----------|-----|
| Business, Enterprise, Edu | The skill in the [`vox-calibre`](vox-calibre/) folder, plus [`custom-instructions.md`](custom-instructions.md) if you want it on every reply |
| Plus, Pro | [`custom-instructions.md`](custom-instructions.md), up to 5,000 characters |
| Free, Go | [`custom-instructions-short.md`](custom-instructions-short.md), up to 1,500 characters |

The skill carries the full rule set, and ChatGPT loads it on its own whenever you ask for writing,
including documents and files. Custom instructions apply to every reply, but ChatGPT caps their
length, so they hold a condensed copy. The short file keeps the voice, the plain-word rules, and
the most common banned phrases. It drops most of the precision rules, such as defining terms and
saying what a referenced meeting was.

## Install the skill (Business, Enterprise, Edu)

1. Download the [`vox-calibre`](vox-calibre/) folder, which holds one file, `SKILL.md`.
2. In ChatGPT, open Plugins in the sidebar and choose the Skills tab.
3. Choose Create, then Upload from your computer.
4. Select the `vox-calibre` folder.
5. Wait for ChatGPT to scan it. Most skills are ready as soon as the scan finishes.

Nobody has tried this upload yet. If the upload won't take a folder, try `SKILL.md` on its own,
then a `.zip` of the folder. If the scan marks the skill Needs Review, open it and read what
ChatGPT flagged. If Upload from your computer doesn't appear, the workspace admin needs to turn on
skill uploading under Permissions & roles.

To give the skill to others in the workspace, open its "•••" menu and choose Share.

To check that it works, ask ChatGPT to "draft a short email in the Vox Calibre house style". The
reply comes back with contractions, whole sentences, and no "I hope this helps".

## Set up custom instructions

1. Open the file for your plan and copy all of it.
2. In ChatGPT, click your profile icon and open Settings.
3. Choose Personalization, then Custom Instructions. On the phone app, open Settings and choose
   Customize ChatGPT.
4. Turn on Enable customization if it's off.
5. Paste the text into the box that asks how ChatGPT should respond. Leave the "about you" fields
   as they are.
6. Click Save.

If ChatGPT says the text is too long, you copied the wrong file for your plan. Use the short one.

The style applies to every chat right away, including old ones.

## Optional settings that help

In Settings, under Personalization:

- Set Characteristics: Enthusiastic to "Less" and Emojis to "Less". Leave Warm and Headers & Lists
  as they are.
- Leave Base style and tone on Default. "Efficient" tends to clip sentences into fragments, which
  the style asks ChatGPT to avoid.

## Using it in one project only

To keep the style inside one ChatGPT project, paste the text into that project's instructions
instead. In the project, open the "•••" menu and choose Project settings. Project instructions
replace your general custom instructions while you're in that project.

## Getting updates

When the rules change, the files in this folder change with them. To pick up the new version,
upload the new `SKILL.md` if you use the skill, or paste the new text if you use custom
instructions.
