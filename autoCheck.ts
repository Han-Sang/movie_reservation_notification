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
        .catch((err) => {
            console.error('[Telegram 전송 실패]', err);
        });
};

async function main(): Promise<void> {
    console.log('영화 감시 시작');
    console.log(`영화: ${TARGET_MOVIE}`);
    console.log(`날짜: ${TARGET_DATE}`);
    console.log(`극장: ${TARGET_THEATER}`);

    // 시작 메시지
    await bot.sendMessage(
        config.telegram.chatId,
        `🎬 영화 예매 감시를 시작합니다.\n\n` +
        `영화: ${TARGET_MOVIE}\n` +
        `날짜: ${TARGET_DATE.substring(0, 4)}-${TARGET_DATE.substring(4, 6)}-${TARGET_DATE.substring(6, 8)}\n` +
        `극장: 남양주 현대아울렛 스페이스원 Dolby Cinema`
    );

    while (true) {
        try {
            console.log(
                `[${new Date().toISOString()}] 시간표 확인 중...`
            );

            console.log('[10] crawler.crawl() 호출');

            const result = await crawler.crawl();

            // ★ 여기까지 나오면 crawl()이 정상적으로 return한 것
            console.log('[11] crawler.crawl() 반환 완료');
            console.log('[11-1] result 타입:', typeof result);
            console.log('[11-2] result 길이:', result?.length);
            console.log('[11-3] result:', JSON.stringify(result));

            const normalizedResult = (result ?? '').replace(/\s+/g, '');
            const normalizedMovie = TARGET_MOVIE.replace(/\s+/g, '');

            console.log(
                '[12] TARGET_MOVIE:',
                JSON.stringify(TARGET_MOVIE)
            );

            console.log(
                '[13] 정규화된 영화명:',
                JSON.stringify(normalizedMovie)
            );

            console.log(
                '[14] 영화 포함 여부:',
                normalizedResult.includes(normalizedMovie)
            );

            // 목표 영화가 있는 경우
            if (
                result &&
                normalizedResult.includes(normalizedMovie)
            ) {
                console.log(
                    '[15] 오딧세이 발견 → Telegram 전송 시작'
                );

                const message =
                    `🚨 ${TARGET_MOVIE} 예매 오픈!\n\n` +
                    `📅 ${TARGET_DATE.substring(0, 4)}-${TARGET_DATE.substring(4, 6)}-${TARGET_DATE.substring(6, 8)}\n` +
                    `🎬 남양주 현대아울렛 스페이스원\n` +
                    `🎞️ Dolby Cinema\n\n` +
                    result;

                console.log('[15-1] Telegram 메시지 생성 완료');
                console.log('[15-2] Telegram 전송 직전');

                await bot.sendMessage(
                    config.telegram.chatId,
                    message
                );

                console.log(
                    '[16] Telegram 정보 메시지 전송 완료'
                );

                console.log(
                    '[17] 목표 영화 발견! 감시를 종료합니다.'
                );

                break;
            }

            // 목표 영화가 없는 경우
            console.log(
                `[18] ${TARGET_MOVIE}가 아직 시간표에 없습니다.`
            );

            console.log('[19] 10초 후 다시 확인합니다.');

            await new Promise(resolve =>
                setTimeout(resolve, 10000)
            );

        } catch (err) {
            console.error('[감시 오류]', err);

            try {
                await bot.sendMessage(
                    config.telegram.chatId,
                    `⚠️ 예매 감시 중 오류가 발생했습니다.\n\n${String(err)}`
                );
            } catch (telegramErr) {
                console.error(
                    '[오류 메시지 Telegram 전송 실패]',
                    telegramErr
                );
            }

            console.log(
                '[20] 30초 후 다시 시도합니다.'
            );

            await new Promise(resolve =>
                setTimeout(resolve, 30000)
            );
        }
    }

    console.log('[21] 감시 종료');

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
