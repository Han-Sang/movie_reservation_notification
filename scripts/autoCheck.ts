import TelegramBot from 'node-telegram-bot-api';
import DolbyCrawler from './crawlers/dolbyCrawler';
import { config } from './config';

const TARGET_DATE = '20260826';
const TARGET_THEATER = '남돌비';
const TARGET_MOVIE = '오딧세이';

const bot = new TelegramBot(config.telegram.token, {
    polling: false
});

const crawler = new DolbyCrawler(TARGET_DATE, TARGET_THEATER);

crawler.notify = (msg: string) => {
    bot.sendMessage(config.telegram.chatId, msg)
        .catch((err) => console.error('[Telegram 전송 실패]', err));
};

function formatDate(date: string): string {
    return `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
}

async function main(): Promise<void> {
    console.log(`영화 감시 시작`);
    console.log(`영화: ${TARGET_MOVIE}`);
    console.log(`날짜: ${TARGET_DATE}`);
    console.log(`극장: ${TARGET_THEATER}`);

    await bot.sendMessage(
        config.telegram.chatId,
        `🎬 영화 예매 감시를 시작합니다.\n\n` +
        `영화: ${TARGET_MOVIE}\n` +
        `날짜: ${formatDate(TARGET_DATE)}\n` +
        `극장: 남양주 현대아울렛 스페이스원 Dolby Cinema`
    );

    try {
        const result = await crawler.crawl();

console.log('[10] TARGET_MOVIE:', JSON.stringify(TARGET_MOVIE));
console.log('[10] result 포함 여부:', result.includes(TARGET_MOVIE));
console.log('[10] result 전체:', JSON.stringify(result));
        
      if (result && result.includes(TARGET_MOVIE)) {
    console.log('[10] 오딧세이 발견 → Telegram 전송 시작');

    try {
        await bot.sendMessage(
            config.telegram.chatId,
            `🚨 ${TARGET_MOVIE} 예매 오픈!\n\n` +
            `📅 2026-08-26\n` +
            `🎬 남양주 현대아울렛 스페이스원\n` +
            `🎞️ Dolby Cinema\n\n` +
            result
        );

        console.log('[11] Telegram 정보 메시지 전송 완료');
    } catch (err) {
        console.error('[Telegram 정보 메시지 전송 실패]', err);
        throw err;
    }
}
    } catch (err) {
        console.error('[감시 오류]', err);

        await bot.sendMessage(
            config.telegram.chatId,
            `⚠️ 예매 감시 프로그램 오류\n\n${String(err)}`
        );

        process.exit(1);
    }
}

main().catch(console.error);
