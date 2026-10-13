import os
import asyncio
from typing import Optional
from config import settings
from logger import logger

class BrowserMeetingBot:
    """
    Automates joining meetings (Google Meet, Zoom Web, Microsoft Teams, Jitsi)
    using Playwright inside the virtual X11 display environment.
    """

    def __init__(self, recording_id: str, meeting_url: str, bot_name: Optional[str] = None):
        self.recording_id = recording_id
        self.meeting_url = meeting_url
        self.bot_name = bot_name or settings.DEFAULT_BOT_NAME
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        self.is_active = False

    async def launch_and_join(self):
        """Launches Chromium inside virtual display and navigates to the meeting."""
        from playwright.async_api import async_playwright

        logger.info(f"[{self.recording_id}] Launching browser bot for: {self.meeting_url}")
        self.playwright = await async_playwright().start()

        # Custom Chrome launch arguments for server headless audio/video capture
        args = [
            f"--display={settings.XVFB_DISPLAY}",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--use-fake-ui-for-media-stream",       # Auto-grant mic/camera permissions
            "--use-fake-device-for-media-stream",   # Synthetic test media devices
            "--autoplay-policy=no-user-gesture-required", # Allow audio to play without clicking
            f"--window-size={settings.SCREEN_WIDTH},{settings.SCREEN_HEIGHT}",
            "--start-maximized"
        ]

        self.browser = await self.playwright.chromium.launch(
            headless=False,  # Headless=False because Xvfb provides the virtual display
            args=args
        )

        self.context = await self.browser.new_context(
            viewport={"width": settings.SCREEN_WIDTH, "height": settings.SCREEN_HEIGHT},
            permissions=["microphone", "camera"],
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )

        self.page = await self.context.new_page()
        self.is_active = True

        try:
            await self.page.goto(self.meeting_url, wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(3)

            # Detect platform and perform auto-join
            lower_url = self.meeting_url.lower()
            if "meet.google.com" in lower_url:
                await self._handle_google_meet()
            elif "zoom.us" in lower_url:
                await self._handle_zoom()
            elif "teams.microsoft.com" in lower_url or "teams.live.com" in lower_url:
                await self._handle_teams()
            else:
                logger.info(f"[{self.recording_id}] Generic meeting URL loaded.")

            logger.info(f"[{self.recording_id}] Bot presence confirmed on page.")
        except Exception as e:
            logger.error(f"[{self.recording_id}] Error navigating or joining meeting: {e}")

    async def _handle_google_meet(self):
        """Automates entering name and requesting to join Google Meet."""
        logger.info(f"[{self.recording_id}] Handling Google Meet interface...")
        try:
            # Dismiss sign-in prompt if possible or fill guest name
            name_input = self.page.locator('input[type="text"]').first
            if await name_input.is_visible(timeout=5000):
                await name_input.fill(self.bot_name)
                logger.info(f"[{self.recording_id}] Entered bot name: {self.bot_name}")
                await asyncio.sleep(1)

            # Click Join Now / Ask to Join
            for selector in [
                'button:has-text("Ask to join")',
                'button:has-text("Join now")',
                'button:has-text("طلب الانضمام")',
                'button:has-text("الانضمام الآن")',
                '[aria-label*="join" i]'
            ]:
                join_btn = self.page.locator(selector).first
                if await join_btn.is_visible(timeout=3000):
                    await join_btn.click()
                    logger.info(f"[{self.recording_id}] Clicked join button via selector: {selector}")
                    break
        except Exception as err:
            logger.warning(f"[{self.recording_id}] Non-fatal Google Meet join attempt note: {err}")

    async def _handle_zoom(self):
        """Automates Zoom Web Client join procedure."""
        logger.info(f"[{self.recording_id}] Handling Zoom Web interface...")
        try:
            name_input = self.page.locator('#inputname').first
            if await name_input.is_visible(timeout=5000):
                await name_input.fill(self.bot_name)
                join_btn = self.page.locator('#joinBtn').first
                if await join_btn.is_visible(timeout=2000):
                    await join_btn.click()
        except Exception as err:
            logger.warning(f"[{self.recording_id}] Non-fatal Zoom join attempt note: {err}")

    async def _handle_teams(self):
        """Automates Microsoft Teams web join procedure."""
        logger.info(f"[{self.recording_id}] Handling MS Teams interface...")
        try:
            # Click "Continue on this browser"
            web_btn = self.page.locator('button:has-text("Continue on this browser")').first
            if await web_btn.is_visible(timeout=5000):
                await web_btn.click()
                await asyncio.sleep(2)

            name_input = self.page.locator('input[placeholder*="name" i]').first
            if await name_input.is_visible(timeout=5000):
                await name_input.fill(self.bot_name)
                join_btn = self.page.locator('button:has-text("Join now")').first
                if await join_btn.is_visible(timeout=2000):
                    await join_btn.click()
        except Exception as err:
            logger.warning(f"[{self.recording_id}] Non-fatal Teams join attempt note: {err}")

    async def close(self):
        """Closes browser session cleanly."""
        if not self.is_active:
            return
        self.is_active = False
        logger.info(f"[{self.recording_id}] Closing browser session...")
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
        except Exception as e:
            logger.error(f"[{self.recording_id}] Error closing browser bot: {e}")
