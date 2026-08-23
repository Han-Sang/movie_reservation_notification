import Crawler from './crawler';
import Puppeteer, { ElementHandle, Page } from 'puppeteer';
import Cheerio from 'cheerio';
import { CLOUD_SANDBOX_ARGS } from '../utils/puppeteerArgs';

class DolbyCrawler extends Crawler {

    constructor(date: string, theater: string) {
        super(date, theater);
    }

    /* 메가박스 Dolby 웹 크롤링 */
    async crawl(): Promise<string> {
        this.isStop = false;

        this.browser = await Puppeteer.launch({
            headless: 'new',
            args: CLOUD_SANDBOX_ARGS
        });

        try {
            while (!this.isStop) {
                const page: Page = await this.browser.newPage();

                try {
                    const pageOption = {
    waitUntil: 'domcontentloaded',
    timeout: 60000
} as const;

                    console.log('[1] 메가박스 페이지 접속');

                    await page.goto(
                        this.config.urls.dolby,
                        pageOption
                    );

                    console.log('[2] 극장 선택 시작');

                    await this.selectTheater(page);

                    console.log('[3] 극장 선택 완료');

                    await this.openCalendar(page);

                    console.log('[4] 달력 열기 완료');

                    await this.adjustMonth(page);

                    console.log('[5] 월 조정 완료');

                    await this.selectDay(page);

                    console.log('[6] 날짜 선택 완료');

                    const timetableAvailable =
                        await this.waitForTimetable(page);

                    console.log(
                        '[7] 시간표 확인 결과:',
                        timetableAvailable
                    );

                   if (!timetableAvailable) {
    console.log(
        'Dolby Cinema가 열리지 않았습니다.'
    );

    this.resetErrorCount();

    await this.closeQuietly(page);

    console.log('[WAIT] 3분 후 다시 확인합니다.');

    await new Promise<void>((resolve) => {
        setTimeout(resolve, 3 * 60 * 1000);
    });

    continue;
}

                    console.log('[8] 시간표 파싱 시작');

                    const {
                        timeTable,
                        dolby
                    } = await this.parseDolbyTimetable(page);

                    console.log(
                        '[PARSE] 최종 timeTable 길이:',
                        timeTable.length
                    );

                    console.log(
                        '[PARSE] 최종 dolby:',
                        dolby
                    );

                    console.log(
                        '[9] Dolby 발견 여부:',
                        dolby
                    );

                  if (dolby) {
    console.log('[10] 시간표 반환 시작');

    console.log(
        '[10-1] 반환할 시간표 길이:',
        timeTable.length
    );

    console.log(
        '[10-2] 반환할 시간표:',
        timeTable
    );

    if (this.notify) {
        this.notify(
            `🚨 Dolby Cinema 예매 오픈!\n\n${timeTable}`
        );

        console.log(
            '[10-3] Telegram 시간표 전송 요청 완료'
        );
    }

    await this.closeQuietly(page);

    console.log('[11] 시간표 반환 완료');

    return timeTable;
}

                    console.log(
                        '[10] Dolby Cinema가 열리지 않았습니다.'
                    );

                    this.resetErrorCount();

                    await this.closeQuietly(page);
                    await this.trick();

                } catch (err) {
                    this.handleError(err);

                    console.error(
                        '[크롤링 내부 오류]',
                        err
                    );

                    await this.closeQuietly(page);
                    await this.trick();
                }
            }

            return '';

        } finally {
            console.log(
                '[11-1] crawl finally 진입'
            );

            /*
             * 중요
             *
             * 여기서
             *
             * await this.closeQuietly(this.browser);
             *
             * 를 호출하지 않는다.
             *
             * browser를 닫으면서 crawl() 반환 과정이 꼬이는 것을
             * 방지하기 위해 여기서는 참조만 정리한다.
             */

            this.browser = null;

            console.log(
                '[11-2] crawl finally 종료'
            );
        }
    }

    /* 영화관 선택 */
    private async selectTheater(page: Page): Promise<void> {
        const theater_select:
            ElementHandle<Element> | null =
            await page.waitForSelector(
                'div[class="tab-left-area"] > ul > li > a[title="극장별 선택"]'
            );

        await page.evaluate(
            elem => (elem as HTMLElement)?.click(),
            theater_select
        );

        if (this.theater === '남돌비') {
            const gyeonggi:
                ElementHandle<Element> | null =
                await page.waitForSelector(
                    '#masterBrch > div > div.tab-list-choice > ul > li:nth-child(2) > a[title="경기지점 선택"]'
                );

            await page.evaluate(
                elem => (elem as HTMLElement)?.click(),
                gyeonggi
            );

            const namyang:
                ElementHandle<Element> | null =
                await page.waitForSelector(
                    '#mCSB_5_container > ul.list > li > button[data-brch-no="0019"]'
                );

            await page.evaluate(
                elem => (elem as HTMLElement)?.click(),
                namyang
            );

            await new Promise(resolve =>
                setTimeout(resolve, 100)
            );

            await page.evaluate(
                elem => (elem as HTMLElement)?.click(),
                namyang
            );

        } else if (this.theater === '코돌비') {
            const coex:
                ElementHandle<Element> | null =
                await page.waitForSelector(
                    '#mCSB_4_container > ul.list > li > button[data-brch-no="1351"]'
                );

            await page.evaluate(
                elem => (elem as HTMLElement)?.click(),
                coex
            );

            await new Promise(resolve =>
                setTimeout(resolve, 100)
            );

            await page.evaluate(
                elem => (elem as HTMLElement)?.click(),
                coex
            );
        }

        await page.waitForSelector(
            '#contents > div > div > div.time-schedule.mb30'
        );

        await new Promise(resolve =>
            setTimeout(resolve, 300)
        );
    }

    /* 달력 보기 버튼 클릭 */
    private async openCalendar(page: Page): Promise<void> {
        const calender:
            ElementHandle<Element> | null =
            await page.waitForSelector(
                '#contents > div > div > div.time-schedule.mb30 > div > div.bg-line > button[title="달력보기"]'
            );

        await page.evaluate(
            elem => (elem as HTMLElement)?.click(),
            calender
        );
    }

    /* 달력의 월을 원하는 월까지 이동 */
    private async adjustMonth(page: Page): Promise<void> {
        const month:
            ElementHandle<Element> | null =
            await page.waitForSelector(
                '#ui-datepicker-div > div.ui-datepicker-header.ui-widget-header.ui-helper-clearfix.ui-corner-all > div > span.ui-datepicker-month'
            );

        const monthText:
            string | null | undefined =
            await page.evaluate(
                elem => elem?.textContent,
                month
            );

        const currentMonth: number =
            monthText?.charAt(1) === '월'
                ? parseInt(
                    monthText.charAt(0),
                    10
                )
                : parseInt(
                    monthText?.substring(0, 2) ?? '0',
                    10
                );

        const targetMonth: number =
            parseInt(
                this.date.substring(4, 6),
                10
            );

        const diff: number =
            targetMonth - currentMonth;

        if (diff > 0) {
            for (let i = 0; i < diff; i++) {
                const nextBtn:
                    ElementHandle<Element> | null =
                    await page.waitForSelector(
                        '#ui-datepicker-div > div.ui-datepicker-header.ui-widget-header.ui-helper-clearfix.ui-corner-all > a.ui-datepicker-next.ui-corner-all'
                    );

                await page.evaluate(
                    elem => (elem as HTMLElement)?.click(),
                    nextBtn
                );
            }

        } else if (diff < 0) {
            for (let i = 0; i > diff; i--) {
                const prevBtn:
                    ElementHandle<Element> | null =
                    await page.waitForSelector(
                        '#ui-datepicker-div > div.ui-datepicker-header.ui-widget-header.ui-helper-clearfix.ui-corner-all > a.ui-datepicker-prev.ui-corner-all'
                    );

                await page.evaluate(
                    elem => (elem as HTMLElement)?.click(),
                    prevBtn
                );
            }
        }
    }

    /* 달력에서 원하는 날짜 클릭 */
    private async selectDay(page: Page): Promise<void> {
        const targetDay: string =
            String(
                parseInt(
                    this.date.substring(6, 8),
                    10
                )
            );

        await page.waitForSelector(
            '#ui-datepicker-div > table > tbody td:not(.ui-datepicker-other-month)'
        );

        const days:
            ElementHandle<HTMLTableCellElement>[] =
            await page.$$(
                '#ui-datepicker-div > table > tbody td:not(.ui-datepicker-other-month)'
            );

        for (let i = 0; i < days.length; i++) {
            const dayText:
                string | null =
                await page.evaluate(
                    elem => elem.textContent,
                    days[i]
                );

            if (targetDay === dayText) {
                await page.evaluate(
                    elem => elem.click(),
                    days[i]
                );

                break;
            }
        }
    }

    /* 날짜 클릭 후 시간표 대기 */
    private async waitForTimetable(
        page: Page
    ): Promise<boolean> {

        const dateButtonSelector =
            `#contents > div > div > div.time-schedule.mb30 > div > div.date-list > div.date-area > div > button[date-data="${this.date.substring(0, 4)}.${this.date.substring(4, 6)}.${this.date.substring(6, 8)}"]`;

        const popupTextSelector =
            'section.alert-popup .txt-common';

        await page.waitForSelector(
            `${dateButtonSelector}, ${popupTextSelector}`
        );

        const popupText:
            string | null =
            await page
                .$eval(
                    popupTextSelector,
                    elem => elem.textContent
                )
                .catch(() => null);

        if (
            popupText?.includes(
                '예매가능일이 아닙니다'
            )
        ) {
            return false;
        }

        await page.waitForSelector(
            'div.theater-list'
        );

        await page.waitForSelector(
            `.theater-time table.time-list-table > tbody > tr > td[play-de="${this.date}"]`
        );

        return true;
    }

    /* Dolby Cinema 시간표 파싱 */
    private async parseDolbyTimetable(
        page: Page
    ): Promise<{
        timeTable: string;
        dolby: boolean;
    }> {

        const content: string =
            await page.content();

        const $:
            cheerio.Root =
            Cheerio.load(content);

        const brchNm =
            $('#contents > div > div > h3:nth-child(5)').text();

        const theaterNm =
            $('p.theater-name');

        let timeTable: string = '';
        let dolby: boolean = false;

        theaterNm.each((i, e) => {

            if (
                $(e)
                    .text()
                    .toUpperCase()
                    .includes(
                        'DOLBY CINEMA'
                    )
            ) {

                const movieNm: string =
                    $(e)
                        .parents('.theater-list')
                        .find(
                            '.theater-tit > p > a'
                        )
                        .text()
                        .trim();

                const play:
                    cheerio.Cheerio =
                    $(e)
                        .parents('.theater-type-box')
                        .find(
                            '.theater-time table.time-list-table > tbody > tr > td'
                        );

                const playDate:
                    string | undefined =
                    $(play).attr('play-de');

                if (!dolby) {
                    timeTable +=
                        brchNm +
                        '\n' +
                        playDate?.substring(0, 4) +
                        '년 ' +
                        playDate?.substring(4, 6) +
                        '월 ' +
                        playDate?.substring(6, 8) +
                        '일\n' +
                        'Dolby Cinema 오픈\n\n';
                }

                dolby = true;

                timeTable +=
                    `🎬 ${movieNm}\n`;

                play.each((i, e) => {

                    let playTime: string =
                        $(e)
                            .find(
                                'div.td-ab div.play-time > p'
                            )
                            .first()
                            .text()
                            .trim();

                    let seatRemainCnt: string =
                        $(e)
                            .find(
                                'div.td-ab > div.txt-center > a > p.chair'
                            )
                            .text()
                            .trim();

                    if (
                        $(e).attr('class') ===
                        'end-time'
                    ) {
                        playTime =
                            $(e)
                                .find('p.time')
                                .text()
                                .trim();

                        seatRemainCnt =
                            $(e)
                                .find('p.chair')
                                .text()
                                .trim();
                    }

                    timeTable +=
                        `${playTime} | 남은 좌석수 : ${seatRemainCnt}\n`;
                });

                timeTable += '\n';
            }
        });

        console.log(
            '[PARSE] 최종 timeTable 길이:',
            timeTable.length
        );

        console.log(
            '[PARSE] 최종 dolby:',
            dolby
        );

        return {
            timeTable,
            dolby
        };
    }
}

export default DolbyCrawler;
