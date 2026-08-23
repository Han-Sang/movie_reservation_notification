import TelegramBot from 'node-telegram-bot-api';
import DolbyCrawler from '../src/crawlers/dolbyCrawler';
import { config } from '../src/config';

const TARGET_DATE = '20260831';
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

function normalizeMovieTitle(title: string): string {
    return title
        .replace(/\s+/g, '')
        .trim()
        .toLowerCase();
}

function isTargetMovie(result: string): boolean {
    const normalizedResult = normalizeMovieTitle(result);

    const targetMovieAliases = [
        '오딧세이',
        '오디세이'
    ];

    return targetMovieAliases.some((movie) => {
        return normalizedResult.includes(
            normalizeMovieTitle(movie)
        );
    });
}

async function main(): Promise<void> {

    console.log('==============================');
    console.log('영화 감시 시작');
    console.log('영화:', TARGET_MOVIE);
    console.log('날짜:', TARGET_DATE);
    console.log('극장:', TARGET_THEATER);
    console.log('크롤링 간격: 5분');
    console.log('==============================');

    // 시작 메시지
    try {
        await bot.sendMessage(
            config.telegram.chatId,
            `🎬 영화 예매 감시를 시작합니다.\n\n` +
            `영화: ${TARGET_MOVIE}\n` +
            `날짜: ${TARGET_DATE.substring(0, 4)}-${TARGET_DATE.substring(4, 6)}-${TARGET_DATE.substring(6, 8)}\n` +
            `극장: 남양주 현대아울렛 스페이스원 Dolby Cinema\n` +
            `⏱️ 5분 간격으로 확인합니다.`
        );

        console.log(
            '[START] Telegram 시작 메시지 전송 완료'
        );

    } catch (err) {

        console.error(
            '[START] Telegram 시작 메시지 전송 실패:',
            err
        );
    }

    while (true) {

        try {

            console.log('');
            console.log('==============================');
            console.log('[1] crawler.crawl() 호출');
            console.log('==============================');

            const result: string = await crawler.crawl();

            console.log('==============================');
            console.log('[2] crawler.crawl() 반환 완료');
            console.log('[3] result 타입:', typeof result);
            console.log('[4] result 길이:', result.length);
            console.log('[5] result 내용:');
            console.log(result);
            console.log('==============================');

            console.log(
                '[6] TARGET_MOVIE:',
                JSON.stringify(TARGET_MOVIE)
            );

            console.log(
                '[7] 목표 영화 발견 여부:',
                isTargetMovie(result)
            );

            // 목표 영화 발견
            if (isTargetMovie(result)) {

                console.log('==============================');
                console.log('[8] 목표 영화 발견!');
                console.log('[9] Telegram 전송 시작');
                console.log('==============================');

                const message =
                    `🚨 ${TARGET_MOVIE} 예매 오픈!\n\n` +
                    `📅 ${TARGET_DATE.substring(0, 4)}-${TARGET_DATE.substring(4, 6)}-${TARGET_DATE.substring(6, 8)}\n` +
                    `🎬 남양주 현대아울렛 스페이스원\n` +
                    `🎞️ Dolby Cinema\n\n` +
                    result;

                console.log('[10] 전송할 메시지:');
                console.log(message);

                try {

                    const sentMessage = await bot.sendMessage(
                        config.telegram.chatId,
                        message
                    );

                    console.log('==============================');
                    console.log(
                        '[11] Telegram 정보 메시지 전송 완료'
                    );
                    console.log(
                        '[12] Telegram message_id:',
                        sentMessage.message_id
                    );
                    console.log('==============================');

                } catch (telegramError) {

                    console.error(
                        '[Telegram 정보 메시지 전송 실패]',
                        telegramError
                    );

                    throw telegramError;
                }

                console.log(
                    '[13] 목표 영화 발견 → 감시 종료'
                );

                break;
            }

            // 5분 대기
            console.log(
                `[14] ${TARGET_MOVIE}가 없습니다.`
            );

            console.log(
                '[15] 5분 후 다시 확인합니다.'
            );

            await new Promise<void>((resolve) => {
                setTimeout(
                    resolve,
                    5 * 60 * 1000
                );
            });

        } catch (err) {

            console.error('==============================');
            console.error('[감시 오류]');
            console.error(err);
            console.error('==============================');

            console.log(
                '[오류] 30초 후 다시 시도합니다.'
            );

            await new Promise<void>((resolve) => {
                setTimeout(
                    resolve,
                    30 * 1000
                );
            });
        }
    }

    console.log('[16] Telegram polling 종료');

    await bot.stopPolling();

    console.log('[17] 프로그램 종료');
}

main().catch(async (err) => {

    console.error('==============================');
    console.error('[프로그램 최종 오류]');
    console.error(err);
    console.error('==============================');

    try {

        await bot.sendMessage(
            config.telegram.chatId,
            `⚠️ 예매 감시 프로그램에서 오류가 발생했습니다.\n\n${String(err)}`
        );

    } catch (telegramError) {

        console.error(
            '[최종 오류 메시지 Telegram 전송 실패]',
            telegramError
        );
    }

    process.exit(1);
});
