const config = require('./config.json');
const Discord = require('discord.js');
const bot = new Discord.Client();
const FortniteAPI = require('fortnite-api-io');
const fortniteAPI = new FortniteAPI(config.apiKey);
const Jimp = require('jimp');
let endingDaily = null;
let endingFeatured = null;

bot.on('ready', () => {
    console.log(`Logged in as ${bot.user.tag}`);
    checkShop();
    setInterval(() => checkShop(), 30 * 1000);
});

const checkShop = async () => {
    if (endingDaily == null || new Date().getTime() > endingDaily.getTime() || endingFeatured == null || new Date().getTime() > endingFeatured.getTime()) {
        console.log('Sending Item Shop Config');
        const data = await fortniteAPI.getDailyShop({ lang: config.lang });
        endingDaily = new Date(data.endingDates.daily);
        endingFeatured = new Date(data.endingDates.featured);
        await generateImage(data);
    }
};

const generateImage = async (shop) => {
    let categories = [
        {
            category: 'featured',
            name: 'Featured',
            items: [],
        },
        {
            category: 'daily',
            name: 'Daily',
            items: [],
        },
        {
            category: 'specialFeatured',
            name: 'Special Featured',
            items: [],
        },
        {
            category: 'specialDaily',
            name: 'Special Daily',
            items: [],
        },
        {
            category: 'community',
            name: 'Community',
            items: [],
        },
    ];

    await categories.forEach((category) => shop[category.category].forEach((item) => category.items.push(item.full_background)));

    const promises = categories.map((category) => generateCategory(category).catch(() => null));
    Promise.all(promises).then(async () => {
        console.log('Created ItemShop');
        const channel = await bot.channels.cache.get(config.channelId);
        if (typeof channel != 'undefined')
            await channel.send('FORTNITE ITEM SHOP', {
                files: categories.map((category) => (category.items.length > 0 ? `${__dirname}/tmp/${category.name}.png` : null)).filter((item) => item != null),
            });
    });
};

const generateCategory = ({ name, items }) =>
    new Promise(async (resolve, reject) => {
        if (items.length == 0) return reject('Items is empty');
        const amount = 5;
        const size = 256;
        const rows = Math.ceil(items.length / amount);
        const width = 10 + (size + 10) * amount;
        let height = 120;
        for (let i = 0; i < rows; i++) {
            height += size + 20;
        }

        const img = new Jimp(width, height);

        const font = await Jimp.loadFont(`${__dirname}/Burbank.fnt`);
        await img.print(font, 10, 10, name.toUpperCase());
        const watermark = await img.print(font, width - 150, height - 80, '@FNBOT');
        const watermark1 = await img.print(font, width - 150, height - 35, '@Control');

        let y = 60;
        for (let i = 0; i < rows; i++) {
            let x = 10;
            for (let j = i * amount; j < i * amount + amount; j++) {
                if (typeof items[j] == 'undefined') continue;
                const item_img = await Jimp.read(items[j]);
                item_img.resize(size, size).quality(50);
                img.blit(item_img, x, y);
                x += size + 10;
            }
            y += size + 10;
        }
        await img.writeAsync(`${__dirname}/tmp/${name}.png`).catch((err) => console.log(err));
        resolve(img);
    });

bot.login(config.token);
