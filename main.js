const { Webhook, MessageBuilder } = require('discord-webhook-node');
const Hook = new Webhook('Discord Webhook');
const fetch = require('cross-fetch');
const apiKey = 'Hypixel API KEY';

const bot = require('mineflayer').createBot({
	host: 'mc.hypixel.net',
	username: 'Account Email',
	password: 'Password'
});

class Queue {
	constructor() {
		this.array = [];
	}
	
	push(e) { this.array.push(e); }
	pull() { return this.array.shift(); }
	isEmpty() { return this.array.length == 0; }
	includes(e) { return this.array.includes(e); }
	length() { return this.array.length; }
	peek() { return this.array.length == 0 ? undefined : this.array[0]; }
	
	splice(e) {
		const index = this.array.indexOf(e);
		if (index == -1) { return false; }
		this.array.splice(index, 1);
		return true;
	}
}

function sleep(s) {
	return new Promise(resolve => setTimeout(resolve, s));
}

const messageQueue = new Queue();
let speaking = false;
async function speak(msg) {
	messageQueue.push(msg);
	if (speaking == true) { return; }

	speaking = true;
	while (!messageQueue.isEmpty()) {
		await sleep(400);
		bot.chat(messageQueue.pull());
	}
	speaking = false;
}

async function getCataLevel(username) {
	const uuid = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
	if (uuid.status >= 400) {
		return '[API ERROR]';
	} else {
		const cataLevel = await fetch(`https://api.hypixel.net/player?key=${apiKey}&uuid=${uuid.json().id}`);
		return cataLevel.status >= 400 ? '[API ERROR]' : cataLevel.json().player.achievements.skyblock_dungeoneer;
	};
}

const queue = new Queue();
async function fragRun() {
	const username = queue.peek();
	if (!username) { return; }
	
	await speak(`/p accept ${username}`);
	await speak(`/pc Hello ${username}. I'll stay in the party for 5 seconds`);
	await speak(`/pc Join our discord server to learn when new bots are added! https://discord.gg/ScdbkknvEJ`)

	const date = new Date();
	const dateString = `${date.getFullYear()}-${date.getMonth()}-${date.getDay()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
	await Hook.send(new MessageBuilder()
		.setTitle('FragRunBot Logs')
		.setColor('#a300ff')
		.setDescription(`${username} just used FragRunBot\n<:Cata:816001858027782185> Cata level: ${await getCataLevel(username)}`)
		.setFooter(`Bot made by ◦ Chance#0002 ◦ Time: ${dateString}`, 'https://cdn.discordapp.com/avatars/505489427372572689/3ffc8f7d78166d435abfe0851c53939b.png?size=256'));
	
	await speak('/ac §c');
	await sleep(5000);
	
	await speak(`/p leave`);
	console.log(`[FragRunBot] > Sent a webhook; Bot user: ${username}`);
	queue.pull();
}

let busy = false;
async function clearQueue() {
	if (busy) { return; };
	busy = true;
	
	while (!queue.isEmpty()) {
		await fragRun();
	}
	
	busy = false;
}

bot.once('inject_allowed', () => {
	bot.chatAddPattern(/(\[[A-z+]*])? ?([A-z0-9_]+) has invited you to join their party!/, 'invite')
	bot.on('invite', async (_, username) => {
		if (queue.includes(username)) {
			await speak(`/msg ${username} you are already queued!`);
			return;
		};
		if (!queue.isEmpty()) {
			//await speak(`/f ${username}`);
			await speak(`/msg ${username} You have been queued! Currently in position #${queue.length()}`);
		};
		queue.push(username);
		await clearQueue();
	})
	
	bot.chatAddPattern(/The party invite from (\[[A-z+]*])? ?([A-z0-9_]+) has expired./, 'expired')
	bot.on('expired', async (_, username) => {
		if (queue.splice(username) == false) { return; }
		
		//await speak(`/f ${username}`);
		//await sleep(6000);
		await speak(`/msg ${username} You have been dequeued because your party invite expired!`);
	})
});

bot.on('messagestr', (message, position) => {
	console.log(message);
});
