import XCTest

final class MemoriaUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testLivingArchiveTabNavigationAndKeyWorkflows() throws {
        let app = XCUIApplication()
        app.launch()

        // 1. Wait past IOS-01 LaunchSplashView into TabView Archive tab
        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 6), "Main TabView should appear after launch splash")

        let archiveButton = tabBar.buttons["Archive"]
        let circlesButton = tabBar.buttons["Circles"]
        let bookshelfButton = tabBar.buttons["Bookshelf"]
        let settingsButton = tabBar.buttons["Settings"]

        XCTAssertTrue(archiveButton.exists)
        XCTAssertTrue(circlesButton.exists)
        XCTAssertTrue(bookshelfButton.exists)
        XCTAssertTrue(settingsButton.exists)

        // 2. Open AuthSheetView from Archive toolbar and dismiss
        let accountBtn = app.buttons["Account Access"].firstMatch
        if accountBtn.waitForExistence(timeout: 3) {
            accountBtn.tap()
            XCTAssertTrue(app.navigationBars["Memoria Access"].waitForExistence(timeout: 3))
            app.buttons["Close"].firstMatch.tap()
        }

        // 3. Navigate to Circles tab & verify Circle Tools
        circlesButton.tap()
        XCTAssertTrue(app.navigationBars["Family Circles"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.buttons["Accept Invitation Token"].waitForExistence(timeout: 3))

        // 4. Navigate to Bookshelf tab & inspect a volume preview + Preflight
        bookshelfButton.tap()
        XCTAssertTrue(app.navigationBars["Bookshelf"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.staticTexts["Heirloom Library"].waitForExistence(timeout: 3))

        // 5. Navigate to Settings tab & open Support Help Sheet
        settingsButton.tap()
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 3))
        let supportBtn = app.buttons["Help Guides & Submit Support Ticket"].firstMatch
        XCTAssertTrue(supportBtn.waitForExistence(timeout: 3))
        supportBtn.tap()
        XCTAssertTrue(app.navigationBars["Support & Help"].waitForExistence(timeout: 3))
        app.buttons["Close"].firstMatch.tap()
    }
}
