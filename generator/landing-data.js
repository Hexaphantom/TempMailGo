'use strict';
/* Service landing pages — SEO keyword coverage.
 *
 * Each entry has GENUINELY ORIGINAL body copy (no spun/duplicated text across
 * pages). The framing is strictly privacy + spam protection: keeping your real
 * inbox clean, avoiding marketing blasts, and protecting your identity while
 * trying a new service. Nothing here encourages evading paid plans, abusing
 * free trials, or creating multiple accounts to bypass limits.
 *
 * Fields:
 *   slug     -> URL: /temp-mail-for-<slug>/
 *   brand    -> display name of the service
 *   category -> short label ("AI chatbot", "Streaming", ...)
 *   related  -> 2-3 sibling slugs to cross-link
 *   lead     -> 1 unique opening paragraph (privacy angle specific to service)
 *   sections -> array of { h: heading, p: HTML paragraph(s) } — all unique
 */

const SERVICES = [
  {
    slug: 'chatgpt', brand: 'ChatGPT', category: 'AI assistant',
    related: ['claude', 'gemini', 'perplexity'],
    lead: `AI assistants like ChatGPT are some of the fastest-growing products online, which means their signup lists are prime targets for product-update emails, feature announcements, and partner promotions. If you only want to ask a few questions, a temporary email lets you get started without folding your personal address into yet another fast-moving mailing list.`,
    sections: [
      { h: 'Keep AI newsletters out of your real inbox', p: `New AI tools ship features almost weekly, and each release usually comes with an email. That cadence is great for enthusiasts and exhausting for everyone else. Pointing your ChatGPT confirmation email at a disposable inbox means the verification link lands where you can grab it, while the ongoing "what's new" drumbeat never reaches your primary mailbox.` },
      { h: 'Protect your identity while you evaluate a tool', p: `Trying an AI assistant often means pasting in questions that hint at what you're working on. Decoupling that exploration from your real identity is simply good hygiene. A random, no-log temporary address keeps your first impressions of the tool separate from the email you use for banking, work, and family.` },
      { h: 'How to use temp mail with ChatGPT', p: `Open the TempMailGo homepage, copy the address that's generated instantly, and use it where the service asks for an email. When the confirmation message arrives in the live inbox, click the link or copy the code. That's it — no password to remember and nothing left clinging to your personal inbox afterward.` },
    ],
  },
  {
    slug: 'claude', brand: 'Claude', category: 'AI assistant',
    related: ['chatgpt', 'gemini', 'perplexity'],
    lead: `Claude is a thoughtful writing and reasoning assistant, and like any popular tool it comes with an email onboarding flow. A temporary email address lets you complete that flow and receive your verification code without committing your real inbox to another company's mailing list.`,
    sections: [
      { h: 'A clean inbox beats an unsubscribe marathon', p: `Unsubscribing from every product email you accumulate is a chore, and it only works if senders honor it. Prevention is easier: when the sign-up address is disposable, there is nothing to unsubscribe from later. Your personal inbox stays reserved for people and messages that actually matter to you.` },
      { h: 'Separate experimentation from your identity', p: `Testing how Claude handles your drafts, code, or research questions is easier when the account isn't tied to your main email. A private, throwaway address keeps casual evaluation anonymous, so a tool you tried once doesn't become a permanent thread back to you.` },
      { h: 'Receiving your Claude verification email', p: `Grab the instant address from the TempMailGo homepage and paste it into the sign-up form. The confirmation email appears in the real-time inbox within seconds, and any verification code is highlighted so you can copy it in one tap. When you're done, just walk away — the inbox expires on its own.` },
    ],
  },
  {
    slug: 'gemini', brand: 'Gemini', category: 'AI assistant',
    related: ['chatgpt', 'claude', 'perplexity'],
    lead: `Google's Gemini is deeply tied into a broader account ecosystem, so people are understandably cautious about what they attach to it. When you just want to try the assistant, a temporary email keeps that first experience separate from the address that anchors the rest of your digital life.`,
    sections: [
      { h: 'Compartmentalize your accounts', p: `Security professionals recommend not reusing one email across everything, because a single leaked address becomes a map to all your accounts. A disposable inbox for a trial run of Gemini is a small, practical step toward compartmentalization — the new service simply never learns your primary address.` },
      { h: 'Skip the promotional follow-ups', p: `Product suites love to cross-promote: try one feature and you may hear about five others. Routing the initial confirmation to a temporary inbox means you get in the door without signing up for a stream of "you might also like" messages in the mailbox you read every day.` },
      { h: 'Using a disposable inbox with Gemini', p: `Copy your instant TempMailGo address, use it at the prompt, and watch for the verification email in the live inbox. Codes and links show up in real time. Because the address is random and log-free, there's no lasting connection between your test drive and your identity.` },
    ],
  },
  {
    slug: 'grok', brand: 'Grok', category: 'AI assistant',
    related: ['chatgpt', 'claude', 'perplexity'],
    lead: `Grok is the conversational AI woven into a busy social platform, which tends to mean a lively volume of notifications and updates. A temporary email address lets you check the assistant out while keeping that notification firehose pointed away from your real inbox.`,
    sections: [
      { h: 'Curb notification overload before it starts', p: `Social products are engineered to re-engage you, and email is one of their favorite channels. When the address on file is disposable, the re-engagement emails have nowhere meaningful to land. You keep control of your attention instead of handing it to an algorithm.` },
      { h: 'Try it without linking your identity', p: `Curiosity shouldn't cost you your privacy. Evaluating Grok with a random, no-log email means you can form your own opinion of the tool without tying the account to the address you use for everything important.` },
      { h: 'Steps to use temp mail with Grok', p: `From the TempMailGo homepage, copy the auto-generated address and drop it into the sign-up field. The confirmation email arrives in the real-time inbox, verification code highlighted for quick copying. When the inbox expires, it and its contents are deleted for good.` },
    ],
  },
  {
    slug: 'midjourney', brand: 'Midjourney', category: 'AI image generation',
    related: ['sora', 'runway', 'leonardo-ai'],
    lead: `Midjourney turns text prompts into striking images, and getting started usually means an email confirmation somewhere along the way. A temporary email lets you receive that message without adding your personal address to another creative-tool mailing list.`,
    sections: [
      { h: 'Creative tools, endless announcements', p: `Image generators iterate constantly — new models, new styles, new events. Each announcement is an email. If you'd rather not track all of it, a disposable inbox catches the sign-up confirmation and lets the rest evaporate, keeping your real inbox focused.` },
      { h: 'Keep your art experiments private', p: `The prompts you experiment with can reveal a lot about your projects and interests. Registering with a throwaway, log-free email keeps that creative exploration disconnected from your identity, so your artistic tinkering stays your business.` },
      { h: 'Using TempMailGo with Midjourney', p: `Copy the instant address from our homepage, use it wherever the confirmation is required, and open the message the moment it lands in the live inbox. No signup, no password, and nothing left behind in your personal mailbox when you're finished.` },
    ],
  },
  {
    slug: 'sora', brand: 'Sora', category: 'AI video generation',
    related: ['runway', 'kling-ai', 'midjourney'],
    lead: `Sora generates video from text, and interest in it is enormous — which means waitlists, launch emails, and update blasts. A temporary email address lets you sign up for a look without volunteering your real inbox for the accompanying marketing.`,
    sections: [
      { h: 'Waitlists are marketing lists', p: `Joining a waitlist almost always means joining a mailing list too. With a disposable address, you can register your interest and still catch the "you're in" email in the live inbox, without the follow-up promotions reaching the mailbox you actually use.` },
      { h: 'Protect your identity around new AI video tools', p: `Cutting-edge tools are exciting but unproven, and it's reasonable to be cautious about what you attach to them. A random, no-log temporary email keeps your evaluation anonymous until you decide whether the service has earned a spot in your real inbox.` },
      { h: 'How to receive a Sora email with temp mail', p: `Head to the TempMailGo homepage, copy the address generated instantly, and paste it into the sign-up form. When the confirmation or invite email arrives, it appears in the real-time inbox with any code highlighted. The inbox self-destructs on expiry.` },
    ],
  },
  {
    slug: 'runway', brand: 'Runway', category: 'AI video editing',
    related: ['sora', 'kling-ai', 'midjourney'],
    lead: `Runway is a powerful AI video and editing suite aimed at creators. As with most creative platforms, onboarding involves an email step. A temporary email lets you get through it while keeping tutorials, upsells, and newsletters out of your personal inbox.`,
    sections: [
      { h: 'Onboarding emails add up fast', p: `Creative suites tend to send a welcome sequence: tips, showcases, and reminders spread across several days. If you just wanted to try a feature, a disposable inbox absorbs that sequence so your real mailbox never fills with a course you didn't sign up for.` },
      { h: 'Evaluate before you commit your identity', p: `Trying Runway on a real project shouldn't require handing over the email that ties to your whole online presence. A private, throwaway address lets you assess the tool first and only bring your real details in once you're sure it's a keeper.` },
      { h: 'Using a disposable email with Runway', p: `Copy your instant TempMailGo address, use it at sign-up, and open the confirmation in the live inbox as soon as it arrives. Because the address keeps no logs and expires automatically, there's no trail linking your test to you.` },
    ],
  },
  {
    slug: 'kling-ai', brand: 'Kling AI', category: 'AI video generation',
    related: ['sora', 'runway', 'higgsfield'],
    lead: `Kling AI is a fast-rising text-to-video generator, and rapidly growing platforms tend to email often as they roll out features. A temporary email address lets you try it out and grab your verification code without inviting that stream into your real inbox.`,
    sections: [
      { h: 'New platforms email a lot', p: `Early-stage products send frequent updates because everything is changing quickly. That's understandable, but it doesn't have to clutter your main mailbox. A disposable inbox receives the confirmation you need and quietly lets the rest expire.` },
      { h: 'Stay anonymous while you test', p: `Exploring an unfamiliar AI service is lower-risk when it's not connected to your identity. Signing up with a random, no-log email keeps your trial separate, so a tool you may only use once never becomes a permanent link back to you.` },
      { h: 'Steps for Kling AI with temp mail', p: `Open the TempMailGo homepage, copy the instantly generated address, and use it in the sign-up field. The verification email lands in the real-time inbox within seconds, code highlighted for easy copying. When you're done, the inbox deletes itself.` },
    ],
  },
  {
    slug: 'higgsfield', brand: 'Higgsfield', category: 'AI video generation',
    related: ['kling-ai', 'runway', 'sora'],
    lead: `Higgsfield focuses on AI-generated video and motion, and like other emerging creative tools it asks for an email during sign-up. A temporary email lets you receive that message and keep your personal inbox free of the usual onboarding and promo cadence.`,
    sections: [
      { h: 'Try emerging tools without the clutter', p: `The newest creative apps often send the most email, because they're eager to show you what they can do. A disposable inbox is the polite way to look around: you get the confirmation you need, and the marketing sequence never reaches your real mailbox.` },
      { h: 'Keep your projects to yourself', p: `What you generate can hint at client work or personal projects. Registering with a private, log-free address keeps that context detached from your identity, so your experiments stay confidential.` },
      { h: 'Using TempMailGo with Higgsfield', p: `Copy the instant address from our homepage, paste it into the sign-up form, and open the confirmation email in the live inbox as soon as it appears. There's no password to manage and nothing lingering in your personal inbox afterward.` },
    ],
  },
  {
    slug: 'perplexity', brand: 'Perplexity', category: 'AI search',
    related: ['chatgpt', 'claude', 'gemini'],
    lead: `Perplexity is an AI answer engine that many people want to test with a few real questions before deciding if it fits their routine. A temporary email lets you create that trial account without attaching your personal inbox to another product's mailing list.`,
    sections: [
      { h: 'Test the answers, skip the emails', p: `You can only judge a search tool by using it, and that usually requires an account. A disposable inbox lets you register, confirm, and start asking questions — while product updates and tips stay out of the mailbox you rely on every day.` },
      { h: 'Search privacy starts at signup', p: `Your queries can be personal, so keeping the account separate from your identity is sensible. A random, no-log temporary email means your exploration of Perplexity isn't wired directly to the address behind your important accounts.` },
      { h: 'How to use temp mail with Perplexity', p: `Copy the instantly generated address from the TempMailGo homepage, use it at sign-up, and watch for the verification email in the real-time inbox. Codes are highlighted for quick copying, and the inbox expires by itself when you're finished.` },
    ],
  },
  {
    slug: 'leonardo-ai', brand: 'Leonardo AI', category: 'AI image generation',
    related: ['midjourney', 'runway', 'sora'],
    lead: `Leonardo AI is a popular image and asset generator for creators and game artists. Getting started involves an email confirmation, and a temporary email lets you complete it without signing your personal address up for a steady creative newsletter.`,
    sections: [
      { h: 'Creative newsletters, on your terms', p: `Asset generators love to share community showcases and feature drops by email. If you're not ready for that, a disposable inbox catches your confirmation and lets the rest pass by, keeping your real mailbox uncluttered.` },
      { h: 'Separate your art from your identity', p: `The styles and subjects you generate can reveal your interests and client work. A private, log-free temporary email keeps that exploration anonymous, so your creative process doesn't leave a trail attached to you.` },
      { h: 'Using a disposable email with Leonardo AI', p: `From the TempMailGo homepage, copy the auto-generated address and use it in the sign-up form. The confirmation email appears in the live inbox in seconds, verification code highlighted. Nothing is left behind in your personal inbox when the address expires.` },
    ],
  },
  {
    slug: 'suno', brand: 'Suno', category: 'AI music generation',
    related: ['elevenlabs', 'runway', 'midjourney'],
    lead: `Suno turns prompts into full songs, and music-generation platforms typically email about new models, contests, and community features. A temporary email lets you try composing without adding your personal inbox to yet another creative mailing list.`,
    sections: [
      { h: 'Fewer promos, more music', p: `Once you're on a creative platform's list, the announcements rarely stop. A disposable inbox lets you receive the sign-up confirmation you need and skip the ongoing promotional stream, keeping your real inbox tidy and focused.` },
      { h: 'Keep your creative experiments private', p: `The lyrics and styles you prompt can be personal. Registering with a random, no-log email keeps your musical experiments detached from your identity, so a quick try of Suno never becomes a lasting link back to you.` },
      { h: 'Using TempMailGo with Suno', p: `Copy the instant address from our homepage, use it where the confirmation is required, and open the message in the live inbox as soon as it lands. No signup, no password, and no leftover clutter in your personal mailbox.` },
    ],
  },
  {
    slug: 'elevenlabs', brand: 'ElevenLabs', category: 'AI voice generation',
    related: ['suno', 'runway', 'midjourney'],
    lead: `ElevenLabs is a leading AI voice and text-to-speech platform. Trying its voices means creating an account, and a temporary email lets you receive the confirmation without folding your personal address into another product's update list.`,
    sections: [
      { h: 'Onboarding without the aftermath', p: `Voice platforms often follow signup with tips, showcases, and feature emails. A disposable inbox absorbs all of that, so your first experiment with ElevenLabs doesn't turn into a recurring newsletter in the mailbox you actually read.` },
      { h: 'Protect your identity while you evaluate', p: `Testing a new tool shouldn't require attaching it to the email tied to your whole online life. A private, log-free temporary address keeps your evaluation anonymous until you decide the service is worth your real details.` },
      { h: 'How to use temp mail with ElevenLabs', p: `Copy your instant TempMailGo address, paste it into the sign-up form, and watch the real-time inbox for the verification email. Any code is highlighted for quick copying, and the inbox self-destructs when it expires.` },
    ],
  },
  {
    slug: 'netflix', brand: 'Netflix', category: 'Streaming',
    related: ['spotify', 'steam', 'reddit'],
    lead: `Streaming services send a steady mix of recommendations, "new on the service" alerts, and account notices. When you're setting up or testing streaming on a device, a temporary email lets you handle the confirmation step without routing all of that to your personal inbox.`,
    sections: [
      { h: 'Recommendation emails add up', p: `Streaming platforms are enthusiastic emailers — new titles, "because you watched," and reminders. If you'd rather not receive that stream, a disposable inbox catches the confirmation you need while keeping the marketing out of the mailbox you rely on.` },
      { h: 'Keep signups separate from your identity', p: `Using one email everywhere makes you easy to profile across services. A random, no-log temporary address for a streaming signup keeps that account compartmentalized from your primary inbox and the accounts attached to it.` },
      { h: 'Using a disposable email with streaming signups', p: `Copy the instant address from the TempMailGo homepage and use it where a confirmation email is required. The message lands in the real-time inbox in seconds, with any verification link ready to open. Please use streaming services in line with their own terms.` },
    ],
  },
  {
    slug: 'spotify', brand: 'Spotify', category: 'Streaming',
    related: ['netflix', 'discord', 'reddit'],
    lead: `Music platforms love email: new releases, playlists, concert alerts, and more. When you just need to confirm an account, a temporary email lets you receive that message and keep the ongoing promotional soundtrack out of your personal inbox.`,
    sections: [
      { h: 'Playlists in the app, not your inbox', p: `Discovery is great inside a music app and less welcome as a flood of email. A disposable inbox lets you complete the signup confirmation and leaves the "new music for you" messages behind, so your real mailbox stays focused on what matters.` },
      { h: 'Compartmentalize your accounts', p: `Reusing your main email across every service creates a single thread that links them all. A temporary, log-free address for a music signup keeps that account separate, adding a small but real layer of privacy.` },
      { h: 'Steps to use temp mail with music services', p: `Open the TempMailGo homepage, copy the instantly generated address, and paste it into the sign-up form. The confirmation email appears in the live inbox with any code highlighted. Use the service according to its own terms of use.` },
    ],
  },
  {
    slug: 'discord', brand: 'Discord', category: 'Community & chat',
    related: ['reddit', 'telegram', 'steam'],
    lead: `Discord is where countless communities gather, and joining sometimes means a verification email. A temporary email lets you confirm access to a server or community without attaching your personal inbox to a platform that can be chatty with notifications.`,
    sections: [
      { h: 'Community access without notification overload', p: `Once you're on a platform, notification and digest emails tend to follow. A disposable inbox receives the verification you need to get in, while keeping the ongoing alerts out of the mailbox you check every day.` },
      { h: 'Protect your identity in public spaces', p: `Community platforms are semi-public, and it's wise not to attach the email behind your important accounts to a space full of strangers. A random, no-log temporary address lets you participate while keeping your real identity a step removed.` },
      { h: 'How to use temp mail with Discord', p: `Copy the instant address from our homepage, use it during sign-up, and open the verification email in the real-time inbox as soon as it arrives. Please follow the platform's community guidelines and terms when you participate.` },
    ],
  },
  {
    slug: 'steam', brand: 'Steam', category: 'Gaming',
    related: ['discord', 'reddit', 'netflix'],
    lead: `Gaming platforms send sale alerts, wishlist notices, and update emails on a regular schedule. When you're setting up access on a new device or just confirming a signup, a temporary email lets you receive that message without the promotions reaching your personal inbox.`,
    sections: [
      { h: 'Sale alerts on your terms', p: `Storefront emails are frequent, especially around big sales. If you'd rather browse deals in the app on your own schedule, a disposable inbox catches your confirmation and leaves the alert stream behind, keeping your real mailbox calm.` },
      { h: 'Keep your gaming account compartmentalized', p: `Linking every service to one email makes that address a single point of exposure. A temporary, log-free address for a gaming signup keeps the account separate from your primary inbox and the accounts tied to it.` },
      { h: 'Using a disposable email with gaming signups', p: `Copy the instant TempMailGo address, use it where a confirmation is required, and open the message in the live inbox within seconds. Please use gaming platforms in accordance with their own terms of service.` },
    ],
  },
  {
    slug: 'reddit', brand: 'Reddit', category: 'Community & forums',
    related: ['discord', 'telegram', 'instagram'],
    lead: `Reddit is a hub of communities and discussions, and creating an account can involve email verification. A temporary email lets you confirm your account and take part without wiring your personal inbox to a stream of digests and notifications.`,
    sections: [
      { h: 'Join the conversation, skip the digests', p: `Forums send activity digests, reply notices, and recommendations by email. A disposable inbox lets you verify your account and jump into discussions while keeping those recurring emails out of the mailbox you actually use.` },
      { h: 'Anonymity is part of the point', p: `Community discussion often works best when it isn't tied to your real-world identity. Registering with a random, no-log temporary email supports that separation, so your participation isn't linked to the address behind your important accounts.` },
      { h: 'Steps to use temp mail with Reddit', p: `From the TempMailGo homepage, copy the instantly generated address and use it in the sign-up form. The verification email lands in the real-time inbox in seconds. Please follow the platform's content policy and terms when you post.` },
    ],
  },
  {
    slug: 'instagram', brand: 'Instagram', category: 'Social media',
    related: ['telegram', 'reddit', 'discord'],
    lead: `Social platforms are among the most persistent emailers, sending activity alerts, suggestions, and reminders. When a signup or a new device asks for email confirmation, a temporary email lets you handle it without opening the floodgates to your personal inbox.`,
    sections: [
      { h: 'Turn down the notification volume', p: `Social apps are designed to pull you back, and email is a key channel for that. When the address on file is disposable, those re-engagement emails have nowhere useful to go, and your real inbox stays focused on the messages you care about.` },
      { h: 'Keep your identity a step removed', p: `The email behind your social account can connect to a surprising amount of personal information. A random, no-log temporary address adds separation between a social signup and the inbox that anchors your banking, work, and family mail.` },
      { h: 'How to use temp mail with social signups', p: `Copy the instant address from our homepage, use it at sign-up, and open the verification email in the real-time inbox as soon as it arrives. Please use social platforms in line with their own terms and community standards.` },
    ],
  },
  {
    slug: 'telegram', brand: 'Telegram', category: 'Messaging',
    related: ['discord', 'reddit', 'instagram'],
    lead: `Telegram is a messaging platform many people use for channels, bots, and communities. Where an email confirmation is involved, a temporary email lets you complete it while keeping the associated notifications and updates away from your personal inbox.`,
    sections: [
      { h: 'Messaging updates, minus the inbox clutter', p: `Signing up for channels and services around a messaging platform can generate a trickle of email. A disposable inbox absorbs the confirmations, so your real mailbox isn't gradually filled with alerts you didn't ask to keep.` },
      { h: 'Privacy-minded from the first step', p: `People choose messaging tools partly for privacy, and that mindset should extend to signup. A random, log-free temporary email keeps the account separated from your identity, consistent with a privacy-first approach.` },
      { h: 'Using TempMailGo with Telegram', p: `Copy the instantly generated address, use it where a confirmation is required, and open the email in the live inbox within seconds. Please follow the platform's terms of service as you use it.` },
    ],
  },
  {
    slug: 'adobe', brand: 'Adobe', category: 'Creative software',
    related: ['canva', 'leonardo-ai', 'midjourney'],
    lead: `Adobe's creative tools are industry standards, and its account system comes with a full welcome and update cadence. When you're trying a tool or setting up access, a temporary email lets you receive the confirmation without committing your personal inbox to the ongoing marketing.`,
    sections: [
      { h: 'Welcome sequences you never asked for', p: `Large software suites send onboarding emails, tips, and cross-promotions across their product family. A disposable inbox catches the confirmation you actually need and leaves the sequence behind, keeping your real mailbox uncluttered.` },
      { h: 'Evaluate first, share details later', p: `Assessing a creative tool shouldn't require attaching the email tied to your whole online identity. A private, no-log temporary address lets you look around first, so you only bring your real details in once you're sure the tool fits.` },
      { h: 'Using a disposable email with Adobe', p: `Copy your instant TempMailGo address, use it at sign-up, and open the confirmation email in the real-time inbox as soon as it lands. Please use the software in accordance with its own terms and licensing.` },
    ],
  },
  {
    slug: 'canva', brand: 'Canva', category: 'Design software',
    related: ['adobe', 'leonardo-ai', 'midjourney'],
    lead: `Canva makes design approachable, and its onboarding includes an email step plus a friendly stream of templates, tips, and feature news. A temporary email lets you get started while keeping that ongoing cadence out of your personal inbox.`,
    sections: [
      { h: 'Design inspiration, not inbox overload', p: `Template suggestions and feature highlights are useful in the app and overwhelming in your mailbox. A disposable inbox receives your signup confirmation and lets the recurring inspiration emails pass by, so your real inbox stays focused.` },
      { h: 'Keep casual projects private', p: `The designs you experiment with can hint at events, businesses, or clients. Registering with a random, log-free temporary email keeps that work detached from your identity, so a quick project doesn't leave a trail back to you.` },
      { h: 'How to use temp mail with Canva', p: `Open the TempMailGo homepage, copy the instantly generated address, and paste it into the sign-up form. The confirmation email appears in the live inbox in seconds, any code highlighted for easy copying. Please use the service under its own terms.` },
    ],
  },
];

module.exports = { SERVICES };
