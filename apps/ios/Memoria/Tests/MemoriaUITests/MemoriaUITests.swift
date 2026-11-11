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

        // 2. Archive tab: density selector, Favorites filter, Collections, Trash Recovery, Onboarding & Upload Queue sheets
        let grid2Btn = app.buttons["2-Col Grid"].firstMatch
        if grid2Btn.waitForExistence(timeout: 3) {
            grid2Btn.tap()
        }
        let grid3Btn = app.buttons["3-Col Grid"].firstMatch
        if grid3Btn.exists {
            grid3Btn.tap()
        }
        let listBtn = app.buttons["List"].firstMatch
        if listBtn.exists {
            listBtn.tap()
        }

        let favBtn = app.buttons["Favorites Filter"].firstMatch
        if favBtn.waitForExistence(timeout: 3) {
            favBtn.tap()
            favBtn.tap()
        }

        let onboardingBtn = app.buttons["Onboarding"].firstMatch
        if onboardingBtn.waitForExistence(timeout: 3) {
            onboardingBtn.tap()
            XCTAssertTrue(app.navigationBars["Heirloom Setup"].waitForExistence(timeout: 3))
            app.buttons["Done"].firstMatch.tap()
        }

        let collectionsPill = app.buttons["Collections"].firstMatch
        if collectionsPill.waitForExistence(timeout: 3) {
            collectionsPill.tap()
            XCTAssertTrue(app.navigationBars["Collections"].waitForExistence(timeout: 3))
            app.navigationBars.buttons.element(boundBy: 0).tap()
        }

        let switchSpaceBtn = app.buttons["Switch Space"].firstMatch
        if switchSpaceBtn.waitForExistence(timeout: 3) {
            switchSpaceBtn.tap()
            XCTAssertTrue(app.navigationBars["Memory Spaces"].waitForExistence(timeout: 3))
            app.buttons["Close"].firstMatch.tap()
        }

        let captureBtn = app.buttons["Capture Memory"].firstMatch
        if captureBtn.waitForExistence(timeout: 3) {
            captureBtn.tap()
            let photoOrStoryItem = app.buttons["Photo or Story"].firstMatch
            if photoOrStoryItem.waitForExistence(timeout: 3) {
                photoOrStoryItem.tap()
                XCTAssertTrue(app.navigationBars["New Memory"].waitForExistence(timeout: 3))
                app.buttons["Cancel"].firstMatch.tap()
            }
        }

        if captureBtn.waitForExistence(timeout: 3) {
            captureBtn.tap()
            let uploadQueueItem = app.buttons["Upload Queue"].firstMatch
            if uploadQueueItem.waitForExistence(timeout: 3) {
                uploadQueueItem.tap()
                XCTAssertTrue(app.navigationBars["Upload Queue"].waitForExistence(timeout: 3))
                app.buttons["Close"].firstMatch.tap()
            }
        }

        let trashBtn = app.buttons["Trash Recovery"].firstMatch
        if trashBtn.waitForExistence(timeout: 3) {
            trashBtn.tap()
            XCTAssertTrue(app.navigationBars["Trash Recovery"].waitForExistence(timeout: 3))
            app.navigationBars.buttons.element(boundBy: 0).tap()
        }

        let accountBtn = app.buttons["Account Access"].firstMatch
        if accountBtn.waitForExistence(timeout: 3) {
            accountBtn.tap()
            XCTAssertTrue(app.navigationBars["Memoria Access"].waitForExistence(timeout: 3))
            app.buttons["Close"].firstMatch.tap()
        }

        // 3. Circles tab: Governance sheet, Profiles Directory, Notifications, Accept Invitation Token
        circlesButton.tap()
        XCTAssertTrue(app.navigationBars["Family Circles"].waitForExistence(timeout: 3))

        let govBtn = app.buttons["Space Members & Governance"].firstMatch
        XCTAssertTrue(govBtn.waitForExistence(timeout: 3))
        govBtn.tap()
        XCTAssertTrue(app.navigationBars["Space Governance"].waitForExistence(timeout: 3))
        let govEmail = app.textFields["Recipient Email"].firstMatch
        if govEmail.waitForExistence(timeout: 2) {
            govEmail.tap()
            govEmail.typeText("clara@family.local")
            XCTAssertTrue(app.buttons["Send Invitation"].isEnabled)
        }
        app.buttons["Close"].firstMatch.tap()

        let profilesBtn = app.buttons["People & Profiles Directory"].firstMatch
        if profilesBtn.waitForExistence(timeout: 3) {
            profilesBtn.tap()
            XCTAssertTrue(app.navigationBars["People & Profiles"].waitForExistence(timeout: 3))
            app.navigationBars.buttons.element(boundBy: 0).tap()
        }

        let notifBtn = app.buttons["Notification Center"].firstMatch
        if notifBtn.waitForExistence(timeout: 3) {
            notifBtn.tap()
            XCTAssertTrue(app.navigationBars["Notifications"].waitForExistence(timeout: 3))
            app.navigationBars.buttons.element(boundBy: 0).tap()
        }

        XCTAssertTrue(app.buttons["Accept Invitation Token"].waitForExistence(timeout: 3))

        // 4. Bookshelf tab: Book Creator Wizard, Specs Inspector, 2D Proof, Studio, Print Orders & Checkout
        bookshelfButton.tap()
        XCTAssertTrue(app.navigationBars["Bookshelf"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.staticTexts["Heirloom Library"].waitForExistence(timeout: 3))

        let createBookBtn = app.buttons["Create Book"].firstMatch
        XCTAssertTrue(createBookBtn.waitForExistence(timeout: 3))
        createBookBtn.tap()
        XCTAssertTrue(app.navigationBars["Book Creator Wizard"].waitForExistence(timeout: 3))
        let titleField = app.textFields["Book Title (e.g. Bennett Anthology)"].firstMatch
        if titleField.waitForExistence(timeout: 3) {
            titleField.tap()
            titleField.typeText("UI Test Anthology")
        }
        let step2Btn = app.buttons["Continue to Memory Selection (IOS-46)"].firstMatch
        if step2Btn.waitForExistence(timeout: 3) && step2Btn.isEnabled {
            step2Btn.tap()
            let mem1 = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Prologue'")).firstMatch
            if mem1.waitForExistence(timeout: 3) { mem1.tap() }
            let mem2 = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Autumn Harvest'")).firstMatch
            if mem2.waitForExistence(timeout: 2) { mem2.tap() }
            let step3Btn = app.buttons["Continue to Spread Reordering (IOS-47)"].firstMatch
            if step3Btn.waitForExistence(timeout: 3) {
                step3Btn.tap()
                let moveUpBtn = app.buttons["Move Autumn Harvest in Sonoma up"].firstMatch
                if moveUpBtn.waitForExistence(timeout: 2) && moveUpBtn.isEnabled {
                    moveUpBtn.tap()
                }
                let step4Btn = app.buttons["Continue to Template & Cover (IOS-48)"].firstMatch
                if step4Btn.waitForExistence(timeout: 3) {
                    step4Btn.tap()
                    let createSubmitBtn = app.buttons["Create & Curate Heirloom Book"].firstMatch
                    if createSubmitBtn.waitForExistence(timeout: 3) && createSubmitBtn.isEnabled {
                        createSubmitBtn.tap()
                    } else {
                        app.buttons["Close"].firstMatch.tap()
                    }
                } else {
                    app.buttons["Close"].firstMatch.tap()
                }
            } else {
                app.buttons["Close"].firstMatch.tap()
            }
        } else {
            app.buttons["Close"].firstMatch.tap()
        }

        XCTAssertTrue(app.staticTexts["UI Test Anthology"].waitForExistence(timeout: 4), "Wizard should append created book to Bookshelf")

        let specsBtn = app.buttons["Book specifications for The Bennett Heritage"].firstMatch
        if specsBtn.waitForExistence(timeout: 3) {
            specsBtn.tap()
            XCTAssertTrue(app.navigationBars["Book Specifications"].waitForExistence(timeout: 3))
            let runPreflightBtn = app.buttons["Run Automated Preflight"].firstMatch
            if runPreflightBtn.waitForExistence(timeout: 2) {
                runPreflightBtn.tap()
                XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS '300 DPI'")).firstMatch.waitForExistence(timeout: 3))
            }
            app.buttons["Close"].firstMatch.tap()
        }

        let proof2DBtn = app.buttons["Open accessible 2D proof for The Bennett Heritage"].firstMatch
        if proof2DBtn.waitForExistence(timeout: 3) {
            proof2DBtn.tap()
            XCTAssertTrue(app.navigationBars["Accessible 2D Proof"].waitForExistence(timeout: 3))
            app.buttons["Close"].firstMatch.tap()
        }

        let studioBtn = app.buttons["Studio"].firstMatch
        if studioBtn.waitForExistence(timeout: 3) {
            studioBtn.tap()
            XCTAssertTrue(app.navigationBars["Book Studio"].waitForExistence(timeout: 3))
            let saveBtn = app.buttons["Save"].firstMatch
            if saveBtn.waitForExistence(timeout: 2) { saveBtn.tap() }
            app.buttons["Close"].firstMatch.tap()
        }

        let printOrdersBtn = app.buttons["Print Orders"].firstMatch
        if printOrdersBtn.waitForExistence(timeout: 3) {
            printOrdersBtn.tap()
            XCTAssertTrue(app.navigationBars["Print & Orders"].waitForExistence(timeout: 3))
            let newOrderBtn = app.buttons["Order Physical Hardcover Copy"].firstMatch
            if newOrderBtn.waitForExistence(timeout: 3) {
                newOrderBtn.tap()
                XCTAssertTrue(app.navigationBars["Print Checkout"].waitForExistence(timeout: 3))
                let priorityBtn = app.buttons["Priority Insured Courier"].firstMatch
                if priorityBtn.waitForExistence(timeout: 2) { priorityBtn.tap() }
                let standardBtn = app.buttons["Standard Archival Parcel"].firstMatch
                if standardBtn.waitForExistence(timeout: 2) { standardBtn.tap() }
                app.buttons["Close"].firstMatch.tap()
            }
            app.navigationBars.buttons.element(boundBy: 0).tap()
        }

        // 5. Settings tab: Support Help Sheet
        settingsButton.tap()
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 3))
        let supportBtn = app.buttons["Help Guides & Submit Support Ticket"].firstMatch
        XCTAssertTrue(supportBtn.waitForExistence(timeout: 3))
        supportBtn.tap()
        XCTAssertTrue(app.navigationBars["Support & Help"].waitForExistence(timeout: 3))
        app.buttons["Close"].firstMatch.tap()
    }
}
