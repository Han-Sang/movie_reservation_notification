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

async function main(): Promise<void> {
    console.log(`영화 감시 시작`);
    console.log(`영화: ${TARGET_MOVIE}`);
    console.log(`날짜: ${TARGET_DATE}`);
    console.log(`극장: ${TARGET_THEATER}`);

    await bot.sendMessage(
        config.telegram.chatId,
        `🎬 영화 예매 감시를 시작합니다.\n\n영화: ${TARGET_MOVIE}\n날짜: 2026-08-31\n극장: 남양주 현대아울렛 스페이스원 Dolby Cinema`
    );

    while (true) {
        try {
            console.log(`[${new Date().toISOString()}] 시간표 확인 중...`);

            const result = await crawler.crawl();

console.log('[12] crawl() 결과 수신');
console.log('[12-1] result 타입:', typeof result);
console.log('[12-2] result 길이:', result?.length);
console.log('[12-3] TARGET_MOVIE:', JSON.stringify(TARGET_MOVIE));

const normalizedResult = (result ?? '').replace(/\s+/g, '');
const normalizedMovie = TARGET_MOVIE.replace(/\s+/g, '');

console.log(
    '[13] 영화 포함 여부:',
    normalizedResult.includes(normalizedMovie)
);

if (normalizedResult.includes(normalizedMovie)) {
    console.log('[14] 오딧세이 발견 → Telegram 전송 시작');

    try {
        await bot.sendMessage(
            config.telegram.chatId,
            `🚨 ${TARGET_MOVIE} 예매 오픈!\n\n` +
            `📅 2026-08-26\n` +
            `🎬 남양주 현대아울렛 스페이스원\n` +
            `🎞️ Dolby Cinema\n\n` +
            result
        );

        console.log('[15] Telegram 정보 메시지 전송 완료');
    } catch (err) {
        console.error('[Telegram 정보 메시지 전송 실패]', err);
        throw err;
    }

    console.log('[16] 목표 영화 발견! 감시를 종료합니다.');
    break;
}

console.log('[16] 목표 영화가 없습니다. 다시 확인합니다.');

            console.log(
                `${TARGET_MOVIE}가 아직 시간표에 없습니다. 다시 확인합니다.`
            );

            await new Promise(resolve => setTimeout(resolve, 10000));

        } catch (err) {
            console.error('[감시 오류]', err);

            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }

    await bot.stopPolling();
}

main().catch(async (err) => {
    console.error('[프로그램 오류]', err);

    try {
        await bot.sendMessage(
            config.telegram.chatId,
            `⚠️ 예매 감시 프로그램에서 오류가 발생했습니다.\n\n${String(err)}`
        );
    } catch {
        // Telegram 전송 실패는 무시
    }

    process.exit(1);
});
