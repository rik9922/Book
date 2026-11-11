import XCTest

final class MemoriaUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testLivingArchiveTabNavigationAndKeyWorkflows() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-UITestResetLocalArchive"]
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

            // IOS-33: Create a collection, open CollectionDetailView, curate memory, edit & print
            let colTitleField = app.textFields["Collection Title"].firstMatch
            if colTitleField.waitForExistence(timeout: 2) {
                colTitleField.tap()
                colTitleField.typeText("Summer Heritage Album")
                let addColBtn = app.buttons["Add Collection"].firstMatch
                if addColBtn.waitForExistence(timeout: 2) && addColBtn.isEnabled {
                    addColBtn.tap()
                }
            }

            let createdColCell = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Summer Heritage Album'")).firstMatch
            XCTAssertTrue(createdColCell.waitForExistence(timeout: 3), "Created collection should appear in list")
            createdColCell.tap()
            XCTAssertTrue(app.navigationBars["Summer Heritage Album"].waitForExistence(timeout: 3))

            let addMemoriesBtn = app.buttons["Add Memories"].firstMatch
            XCTAssertTrue(addMemoriesBtn.waitForExistence(timeout: 2))
            addMemoriesBtn.tap()
            XCTAssertTrue(app.navigationBars["Add Memories"].waitForExistence(timeout: 3))
            let firstPick = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Prologue'")).firstMatch
            if firstPick.waitForExistence(timeout: 2) {
                firstPick.tap()
            }
            let secondPick = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Autumn Harvest'")).firstMatch
            if secondPick.waitForExistence(timeout: 2) {
                secondPick.tap()
            }
            app.buttons["Done"].firstMatch.tap()

            // IOS-33: Reorder curated memories in CollectionDetailView
            let moveCollectionUp = app.buttons["Move Autumn Harvest in Sonoma up in collection"].firstMatch
            if moveCollectionUp.waitForExistence(timeout: 3) && moveCollectionUp.isEnabled {
                moveCollectionUp.tap()
            }

            let editColBtn = app.buttons["Edit"].firstMatch
            if editColBtn.waitForExistence(timeout: 2) {
                editColBtn.tap()
                XCTAssertTrue(app.navigationBars["Edit Collection"].waitForExistence(timeout: 3))
                let editColTitle = app.textFields["Collection Title"].firstMatch
                if editColTitle.waitForExistence(timeout: 2) {
                    editColTitle.tap()
                    editColTitle.typeText(" 2026")
                }
                let saveColBtn = app.buttons["Save"].firstMatch
                if saveColBtn.waitForExistence(timeout: 2) && saveColBtn.isEnabled {
                    saveColBtn.tap()
                    XCTAssertTrue(app.navigationBars["Summer Heritage Album 2026"].waitForExistence(timeout: 3))
                } else {
                    app.buttons["Cancel"].firstMatch.tap()
                }
            }

            let printBookBtn = app.buttons["Print as Book"].firstMatch
            if printBookBtn.waitForExistence(timeout: 2) {
                printBookBtn.tap()
                XCTAssertTrue(app.navigationBars["Book Creator Wizard"].waitForExistence(timeout: 3))
                app.buttons["Close"].firstMatch.tap()
            }

            app.navigationBars.buttons.element(boundBy: 0).tap()

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

        // IOS-18: Video Capture & Trim -> create trimmed video memory
        if captureBtn.waitForExistence(timeout: 3) {
            captureBtn.tap()
            let videoItem = app.buttons["Video Trim Studio"].firstMatch
            if videoItem.waitForExistence(timeout: 3) {
                videoItem.tap()
                XCTAssertTrue(app.navigationBars["Video Capture & Trim"].waitForExistence(timeout: 3))
                let videoTitleField = app.textFields["Video Title"].firstMatch
                if videoTitleField.waitForExistence(timeout: 2) {
                    videoTitleField.tap()
                    videoTitleField.typeText("Birthday Trim Clip")
                }
                let archiveClipBtn = app.buttons["Archive Clip"].firstMatch
                if archiveClipBtn.waitForExistence(timeout: 2) && archiveClipBtn.isEnabled {
                    archiveClipBtn.tap()
                } else {
                    app.buttons["Cancel"].firstMatch.tap()
                }
            }
        }

        // IOS-19: Oral History Voice Recorder -> create voice note memory
        if captureBtn.waitForExistence(timeout: 3) {
            captureBtn.tap()
            let voiceItem = app.buttons["Voice Oral History"].firstMatch
            if voiceItem.waitForExistence(timeout: 3) {
                voiceItem.tap()
                XCTAssertTrue(app.navigationBars["Voice Studio"].waitForExistence(timeout: 3))
                let startRecBtn = app.buttons["Start Recording"].firstMatch
                if startRecBtn.waitForExistence(timeout: 2) {
                    startRecBtn.tap()
                    let stopRecBtn = app.buttons["Stop Recording"].firstMatch
                    if stopRecBtn.waitForExistence(timeout: 2) {
                        stopRecBtn.tap()
                    }
                }
                let audioTitleField = app.textFields["Recording Title"].firstMatch
                if audioTitleField.waitForExistence(timeout: 2) {
                    audioTitleField.tap()
                    audioTitleField.typeText("Grandpa Oral History")
                }
                let saveAudioBtn = app.buttons["Save Audio"].firstMatch
                if saveAudioBtn.waitForExistence(timeout: 2) && saveAudioBtn.isEnabled {
                    saveAudioBtn.tap()
                } else {
                    app.buttons["Close"].firstMatch.tap()
                }
            }
        }

        // IOS-29: Open created Video memory -> MediaPlaybackView
        let videoCard = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Birthday Trim Clip'")).firstMatch
        XCTAssertTrue(videoCard.waitForExistence(timeout: 4), "Video memory should appear in Archive")
        videoCard.tap()
        XCTAssertTrue(app.navigationBars["Heirloom Story"].waitForExistence(timeout: 3))
        let playMediaBtn = app.buttons["Inspect / Play Media"].firstMatch
        XCTAssertTrue(playMediaBtn.waitForExistence(timeout: 2))
        playMediaBtn.tap()
        XCTAssertTrue(app.navigationBars["Media Viewer"].waitForExistence(timeout: 3))
        let playBtn = app.buttons["Play"].firstMatch
        if playBtn.waitForExistence(timeout: 2) {
            playBtn.tap()
        }
        app.buttons["Done"].firstMatch.tap()
        app.navigationBars.buttons.element(boundBy: 0).tap()

        // IOS-27, IOS-28, IOS-30, IOS-42: Open created Audio memory -> Edit Story, Attach & CoreImage Editor, Audio Player, Reflections Sheet
        let audioCard = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Grandpa Oral History'")).firstMatch
        XCTAssertTrue(audioCard.waitForExistence(timeout: 4), "Audio memory should appear in Archive")
        audioCard.tap()
        XCTAssertTrue(app.navigationBars["Heirloom Story"].waitForExistence(timeout: 3))

        // IOS-27: Edit Story
        let editStoryBtn = app.buttons["Edit Story"].firstMatch
        XCTAssertTrue(editStoryBtn.waitForExistence(timeout: 2))
        editStoryBtn.tap()
        XCTAssertTrue(app.navigationBars["Edit Memory"].waitForExistence(timeout: 3))
        let locField = app.textFields["Location"].firstMatch
        if locField.waitForExistence(timeout: 2) {
            locField.tap()
            locField.typeText("Sonoma Valley")
        }
        app.buttons["Save"].firstMatch.tap()
        XCTAssertTrue(app.staticTexts["Sonoma Valley"].waitForExistence(timeout: 3))

        // IOS-30: Audio Player with synchronized transcript & waveform
        let playAudioBtn = app.buttons["Inspect / Play Media"].firstMatch
        XCTAssertTrue(playAudioBtn.waitForExistence(timeout: 2))
        playAudioBtn.tap()
        XCTAssertTrue(app.navigationBars["Media Viewer"].waitForExistence(timeout: 3))
        let fwdBtn = app.buttons["Skip forward 15 seconds"].firstMatch
        if fwdBtn.waitForExistence(timeout: 2) { fwdBtn.tap() }
        app.buttons["Done"].firstMatch.tap()

        // IOS-28: Attach local specimen & open CoreImage Editor (and verify local persistence across close/reopen)
        let attachBtn = app.buttons["Attach Local Media Specimen"].firstMatch
        if attachBtn.waitForExistence(timeout: 2) {
            attachBtn.tap()
        }
        let editPhotoBtn = app.buttons["Edit Photo"].firstMatch
        XCTAssertTrue(editPhotoBtn.waitForExistence(timeout: 3))
        editPhotoBtn.tap()
        XCTAssertTrue(app.navigationBars["Photo Editor"].waitForExistence(timeout: 3))
        let rotateBtn = app.buttons["Rotate +90°"].firstMatch
        XCTAssertTrue(rotateBtn.waitForExistence(timeout: 2))
        rotateBtn.tap()
        let applyBtn = app.buttons["Apply"].firstMatch
        XCTAssertTrue(applyBtn.waitForExistence(timeout: 2))
        applyBtn.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Non-destructive derivative'")).firstMatch.waitForExistence(timeout: 4))
        app.buttons["Close"].firstMatch.tap()

        // Re-open CoreImage Editor to confirm persisted 90° rotation
        if editPhotoBtn.waitForExistence(timeout: 2) {
            editPhotoBtn.tap()
            XCTAssertTrue(app.navigationBars["Photo Editor"].waitForExistence(timeout: 3))
            XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS '90°'")).firstMatch.waitForExistence(timeout: 3))
            app.buttons["Close"].firstMatch.tap()
        }

        // IOS-42: Emotional Reactions & Family Reflections Sheet
        let heartBtn = app.buttons["Heart reaction"].firstMatch
        if !heartBtn.exists {
            app.swipeUp()
        }
        XCTAssertTrue(heartBtn.waitForExistence(timeout: 3))
        heartBtn.tap()
        let reflectionsBtn = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Reactions & Family Reflections'")).firstMatch
        XCTAssertTrue(reflectionsBtn.waitForExistence(timeout: 3))
        reflectionsBtn.tap()
        XCTAssertTrue(app.navigationBars["Reflections & Notes"].waitForExistence(timeout: 3))
        let warmthBtn = app.buttons["Sheet Warmth reaction"].firstMatch
        if warmthBtn.waitForExistence(timeout: 2) { warmthBtn.tap() }
        let reflectionField = app.textFields["Share a memory or reflection..."].firstMatch
        XCTAssertTrue(reflectionField.waitForExistence(timeout: 2))
        reflectionField.tap()
        reflectionField.typeText("What a cherished voice!")
        let sendBtn = app.buttons["Send Reflection"].firstMatch
        XCTAssertTrue(sendBtn.waitForExistence(timeout: 2) && sendBtn.isEnabled)
        sendBtn.tap()
        XCTAssertTrue(app.staticTexts["What a cherished voice!"].waitForExistence(timeout: 3))
        app.buttons["Close"].firstMatch.tap()

        app.navigationBars.buttons.element(boundBy: 0).tap()

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

            // IOS-37: Create Profile via '+' toolbar button
            let newProfileBtn = app.buttons["New Profile"].firstMatch
            if newProfileBtn.waitForExistence(timeout: 2) {
                newProfileBtn.tap()
                XCTAssertTrue(app.navigationBars["New Profile"].waitForExistence(timeout: 3))
                let profileNameField = app.textFields["Full Name"].firstMatch
                if profileNameField.waitForExistence(timeout: 2) {
                    profileNameField.tap()
                    profileNameField.typeText("Eleanor Bennett")
                }
                let relField = app.textFields["Relationship (e.g. Grandmother, Daughter)"].firstMatch
                if relField.waitForExistence(timeout: 2) {
                    relField.tap()
                    relField.typeText("Grandmother")
                }
                let saveProfileBtn = app.buttons["Save"].firstMatch
                if saveProfileBtn.waitForExistence(timeout: 2) && saveProfileBtn.isEnabled {
                    saveProfileBtn.tap()
                } else {
                    app.buttons["Cancel"].firstMatch.tap()
                }
            }

            // IOS-36: Open ProfileDetailView & IOS-37: Edit Profile Sheet
            let eleanorRow = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Eleanor Bennett'")).firstMatch
            XCTAssertTrue(eleanorRow.waitForExistence(timeout: 3), "Created profile should appear in directory")
            eleanorRow.tap()
            XCTAssertTrue(app.navigationBars["Eleanor Bennett"].waitForExistence(timeout: 3))

            let editProfileBtn = app.buttons["Edit Profile"].firstMatch
            XCTAssertTrue(editProfileBtn.waitForExistence(timeout: 2))
            editProfileBtn.tap()
            XCTAssertTrue(app.navigationBars["Edit Profile"].waitForExistence(timeout: 3))
            let editRelField = app.textFields["Relationship (e.g. Grandmother, Daughter)"].firstMatch
            if editRelField.waitForExistence(timeout: 2) {
                editRelField.tap()
                editRelField.typeText(" Matriarch")
            }
            let saveEditBtn = app.buttons["Save"].firstMatch
            XCTAssertTrue(saveEditBtn.waitForExistence(timeout: 2) && saveEditBtn.isEnabled)
            saveEditBtn.tap()
            XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Matriarch'")).firstMatch.waitForExistence(timeout: 3))

            let genBioBtn = app.buttons["Generate Biography Book"].firstMatch
            if genBioBtn.waitForExistence(timeout: 2) {
                genBioBtn.tap()
                XCTAssertTrue(app.navigationBars["Book Creator Wizard"].waitForExistence(timeout: 3))
                app.buttons["Close"].firstMatch.tap()
            }

            app.navigationBars.buttons.element(boundBy: 0).tap()

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
        XCTAssertTrue(step2Btn.waitForExistence(timeout: 3) && step2Btn.isEnabled)
        step2Btn.tap()
        let mem1 = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Prologue'")).firstMatch
        XCTAssertTrue(mem1.waitForExistence(timeout: 3))
        mem1.tap()
        let mem2 = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Autumn Harvest'")).firstMatch
        XCTAssertTrue(mem2.waitForExistence(timeout: 2))
        mem2.tap()
        let step3Btn = app.buttons["Continue to Spread Reordering (IOS-47)"].firstMatch
        XCTAssertTrue(step3Btn.waitForExistence(timeout: 3))
        step3Btn.tap()
        let moveUpBtn = app.buttons["Move Autumn Harvest in Sonoma up"].firstMatch
        XCTAssertTrue(moveUpBtn.waitForExistence(timeout: 2) && moveUpBtn.isEnabled)
        moveUpBtn.tap()
        let step4Btn = app.buttons["Continue to Template & Cover (IOS-48)"].firstMatch
        XCTAssertTrue(step4Btn.waitForExistence(timeout: 3))
        step4Btn.tap()
        let createSubmitBtn = app.buttons["Create & Curate Heirloom Book"].firstMatch
        XCTAssertTrue(createSubmitBtn.waitForExistence(timeout: 3) && createSubmitBtn.isEnabled)
        createSubmitBtn.tap()

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

    @MainActor
    func testLiveAuthenticatedEndToEndWorkflow() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-UITestResetLocalArchive"]
        app.launchEnvironment["MEMORIA_API_URL"] = "http://127.0.0.1:4000/api/v1"
        app.launch()

        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 8), "Main TabView should appear after launch splash")

        // 1. Register a brand-new user via live API Gateway -> Identity Service -> Postgres
        let accountBtn = app.buttons["Account Access"].firstMatch
        XCTAssertTrue(accountBtn.waitForExistence(timeout: 4))
        accountBtn.tap()
        XCTAssertTrue(app.navigationBars["Memoria Access"].waitForExistence(timeout: 4))

        let accessModePicker = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Access Mode' OR label CONTAINS 'Sign In'")).firstMatch
        XCTAssertTrue(accessModePicker.waitForExistence(timeout: 3))
        accessModePicker.tap()
        let registerOption = app.buttons["Register"].firstMatch
        XCTAssertTrue(registerOption.waitForExistence(timeout: 3))
        registerOption.tap()

        let uniqueEmail = "ios_live_\(Int(Date().timeIntervalSince1970))@memoria.internal"
        let fullNameField = app.textFields["Full Name"].firstMatch
        XCTAssertTrue(fullNameField.waitForExistence(timeout: 3))
        fullNameField.tap()
        fullNameField.typeText("Elena Bennett")

        let emailField = app.textFields["Email Address"].firstMatch
        emailField.tap()
        emailField.typeText(uniqueEmail)

        let passwordField = app.secureTextFields["Password (min 8 chars)"].firstMatch
        passwordField.tap()
        passwordField.typeText("HeirloomPass123!")

        let registerSubmit = app.buttons["Create Archival Account"].firstMatch
        XCTAssertTrue(registerSubmit.waitForExistence(timeout: 2) && registerSubmit.isEnabled)
        registerSubmit.tap()

        // Wait for auth sheet to dismiss after HTTP 201
        XCTAssertTrue(app.buttons["Switch Space"].waitForExistence(timeout: 8), "Auth sheet should dismiss after live registration")

        // 2. Create a live Memory Space via SpaceOverviewSheet -> Memory Service -> Postgres
        app.buttons["Switch Space"].firstMatch.tap()
        XCTAssertTrue(app.navigationBars["Memory Spaces"].waitForExistence(timeout: 4))
        let vaultNameField = app.textFields["Vault Name (e.g. Rivera Family)"].firstMatch
        XCTAssertTrue(vaultNameField.waitForExistence(timeout: 3))
        vaultNameField.tap()
        vaultNameField.typeText("Live Bennett Vault")
        let createVaultBtn = app.buttons["Create Vault"].firstMatch
        XCTAssertTrue(createVaultBtn.waitForExistence(timeout: 2) && createVaultBtn.isEnabled)
        createVaultBtn.tap()
        XCTAssertTrue(app.staticTexts["Vault created and selected."].waitForExistence(timeout: 6))
        app.buttons["Close"].firstMatch.tap()

        // 3. Create 2 live memories via MemoryCreateView -> Memory Service -> Postgres
        func createLiveMemory(title: String, story: String) {
            let captureBtn = app.buttons["Capture Memory"].firstMatch
            XCTAssertTrue(captureBtn.waitForExistence(timeout: 4))
            captureBtn.tap()
            let photoStoryBtn = app.buttons["Photo or Story"].firstMatch
            XCTAssertTrue(photoStoryBtn.waitForExistence(timeout: 3))
            photoStoryBtn.tap()
            XCTAssertTrue(app.navigationBars["New Memory"].waitForExistence(timeout: 3))
            let titleInput = app.textFields["Title (e.g. Anniversary Dinner)"].firstMatch
            titleInput.tap()
            titleInput.typeText(title)
            let storyInput = app.textFields["Story / Content"].firstMatch
            if storyInput.exists {
                storyInput.tap()
                storyInput.typeText(story)
            }
            let saveBtn = app.buttons["Save Memory"].firstMatch
            XCTAssertTrue(saveBtn.waitForExistence(timeout: 2) && saveBtn.isEnabled)
            saveBtn.tap()
            XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", title)).firstMatch.waitForExistence(timeout: 6))
        }

        createLiveMemory(title: "Live Harbor Morning", story: "Sailing across the bay at sunrise.")
        createLiveMemory(title: "Live Autumn Orchard", story: "Warm cider under the cedar pergola.")

        // 4. Open MemoryDetailView -> toggle server-backed Heart reaction -> post server comment -> verify reload persistence
        let firstMemCard = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Live Harbor Morning'")).firstMatch
        firstMemCard.tap()
        XCTAssertTrue(app.navigationBars["Heirloom Story"].waitForExistence(timeout: 4))

        let heartReactionBtn = app.buttons["Heart reaction"].firstMatch
        if !heartReactionBtn.exists { app.swipeUp() }
        XCTAssertTrue(heartReactionBtn.waitForExistence(timeout: 4))
        heartReactionBtn.tap()
        // Wait briefly for PUT /memories/:id/reactions to complete and show count 1
        XCTAssertTrue(
            app.buttons.matching(NSPredicate(format: "label CONTAINS 'Heart'")).firstMatch.waitForExistence(timeout: 4)
        )

        let reflectionsBtn = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Reactions & Family Reflections'")).firstMatch
        XCTAssertTrue(reflectionsBtn.waitForExistence(timeout: 3))
        reflectionsBtn.tap()
        XCTAssertTrue(app.navigationBars["Reflections & Notes"].waitForExistence(timeout: 3))
        let reflectionField = app.textFields["Share a memory or reflection..."].firstMatch
        XCTAssertTrue(reflectionField.waitForExistence(timeout: 2))
        reflectionField.tap()
        reflectionField.typeText("Server persisted reflection!")
        app.buttons["Send Reflection"].firstMatch.tap()
        XCTAssertTrue(app.staticTexts["Server persisted reflection!"].waitForExistence(timeout: 6))
        app.buttons["Close"].firstMatch.tap()

        // Navigate back and re-open to prove server persistence of reaction + comment
        app.navigationBars.buttons.element(boundBy: 0).tap()
        let firstMemCardAgain = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Live Harbor Morning'")).firstMatch
        XCTAssertTrue(firstMemCardAgain.waitForExistence(timeout: 4))
        firstMemCardAgain.tap()
        XCTAssertTrue(app.navigationBars["Heirloom Story"].waitForExistence(timeout: 4))
        if !app.staticTexts["Server persisted reflection!"].exists { app.swipeUp() }
        XCTAssertTrue(app.staticTexts["Server persisted reflection!"].waitForExistence(timeout: 6), "Comment must persist on server across reload")
        XCTAssertTrue(app.staticTexts["1"].waitForExistence(timeout: 4), "Server reaction count 1 must persist across reload")
        app.navigationBars.buttons.element(boundBy: 0).tap()

        // 5. Collection curation & reorder via live API
        app.buttons["Collections"].firstMatch.tap()
        XCTAssertTrue(app.navigationBars["Collections"].waitForExistence(timeout: 4))
        let colTitleField = app.textFields["Collection Title"].firstMatch
        colTitleField.tap()
        colTitleField.typeText("Live Heritage Album")
        app.buttons["Add Collection"].firstMatch.tap()
        let colCell = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Live Heritage Album'")).firstMatch
        XCTAssertTrue(colCell.waitForExistence(timeout: 6))
        colCell.tap()
        XCTAssertTrue(app.navigationBars["Live Heritage Album"].waitForExistence(timeout: 4))
        app.buttons["Add Memories"].firstMatch.tap()
        XCTAssertTrue(app.navigationBars["Add Memories"].waitForExistence(timeout: 4))
        app.buttons.matching(NSPredicate(format: "label CONTAINS 'Live Harbor Morning'")).firstMatch.tap()
        app.buttons.matching(NSPredicate(format: "label CONTAINS 'Live Autumn Orchard'")).firstMatch.tap()
        app.buttons["Done"].firstMatch.tap()
        let moveUpInCol = app.buttons["Move Live Autumn Orchard up in collection"].firstMatch
        if moveUpInCol.waitForExistence(timeout: 4) && moveUpInCol.isEnabled {
            moveUpInCol.tap()
        }
        app.navigationBars.buttons.element(boundBy: 0).tap()
        app.navigationBars.buttons.element(boundBy: 0).tap()

        // 6. Circles -> People & Profiles -> Create & Edit Profile via live API
        tabBar.buttons["Circles"].tap()
        XCTAssertTrue(app.navigationBars["Family Circles"].waitForExistence(timeout: 4))
        let profilesDirBtn = app.buttons["People & Profiles Directory"].firstMatch
        XCTAssertTrue(profilesDirBtn.waitForExistence(timeout: 4))
        profilesDirBtn.tap()
        XCTAssertTrue(app.navigationBars["People & Profiles"].waitForExistence(timeout: 4))

        app.buttons["New Profile"].firstMatch.tap()
        XCTAssertTrue(app.navigationBars["New Profile"].waitForExistence(timeout: 3))
        let profNameField = app.textFields["Full Name"].firstMatch
        profNameField.tap()
        profNameField.typeText("Clara Bennett")
        let profRelField = app.textFields["Relationship (e.g. Grandmother, Daughter)"].firstMatch
        profRelField.tap()
        profRelField.typeText("Daughter")
        app.buttons["Save"].firstMatch.tap()

        let claraRow = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Clara Bennett'")).firstMatch
        XCTAssertTrue(claraRow.waitForExistence(timeout: 6))
        claraRow.tap()
        XCTAssertTrue(app.navigationBars["Clara Bennett"].waitForExistence(timeout: 4))
        app.buttons["Edit Profile"].firstMatch.tap()
        XCTAssertTrue(app.navigationBars["Edit Profile"].waitForExistence(timeout: 3))
        let editRel = app.textFields["Relationship (e.g. Grandmother, Daughter)"].firstMatch
        editRel.tap()
        editRel.typeText(" Firstborn")
        app.buttons["Save"].firstMatch.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Firstborn'")).firstMatch.waitForExistence(timeout: 6))
        app.navigationBars.buttons.element(boundBy: 0).tap()
        app.navigationBars.buttons.element(boundBy: 0).tap()

        // 7. Bookshelf -> Book Creator Wizard -> Preflight -> Freeze SHA-256 -> Print Checkout -> Order Timeline & Reorder
        tabBar.buttons["Bookshelf"].tap()
        XCTAssertTrue(app.navigationBars["Bookshelf"].waitForExistence(timeout: 4))
        app.buttons["Create Book"].firstMatch.tap()
        XCTAssertTrue(app.navigationBars["Book Creator Wizard"].waitForExistence(timeout: 4))

        let bookTitleField = app.textFields["Book Title (e.g. Bennett Anthology)"].firstMatch
        bookTitleField.tap()
        bookTitleField.typeText("Live Bennett Chronicle")
        app.buttons["Continue to Memory Selection (IOS-46)"].firstMatch.tap()
        let pick1 = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Live Harbor Morning'")).firstMatch
        XCTAssertTrue(pick1.waitForExistence(timeout: 5))
        pick1.tap()
        let pick2 = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Live Autumn Orchard'")).firstMatch
        XCTAssertTrue(pick2.waitForExistence(timeout: 3))
        pick2.tap()
        app.buttons["Continue to Spread Reordering (IOS-47)"].firstMatch.tap()
        app.buttons["Continue to Template & Cover (IOS-48)"].firstMatch.tap()
        app.buttons["Create & Curate Heirloom Book"].firstMatch.tap()

        XCTAssertTrue(app.staticTexts["Live Bennett Chronicle"].waitForExistence(timeout: 8), "Created server book must appear on Bookshelf")

        let specsBtn = app.buttons["Book specifications for Live Bennett Chronicle"].firstMatch
        XCTAssertTrue(specsBtn.waitForExistence(timeout: 4))
        specsBtn.tap()
        XCTAssertTrue(app.navigationBars["Book Specifications"].waitForExistence(timeout: 4))

        app.buttons["Run Automated Preflight"].firstMatch.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS '300 DPI'")).firstMatch.waitForExistence(timeout: 6))

        let freezeBtn = app.buttons["Freeze Edition SHA-256"].firstMatch
        if !freezeBtn.waitForExistence(timeout: 2) {
            app.swipeUp()
        }
        XCTAssertTrue(freezeBtn.waitForExistence(timeout: 4))
        freezeBtn.tap()
        XCTAssertTrue(
            app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Edition frozen cleanly' OR label == 'Frozen for Press'")).firstMatch.waitForExistence(timeout: 6),
            "Freeze must lock edition with SHA-256"
        )

        let orderCopyBtn = app.buttons["Order Physical Hardcover (IOS-52)"].firstMatch
        if !orderCopyBtn.waitForExistence(timeout: 2) {
            app.swipeUp()
        }
        XCTAssertTrue(orderCopyBtn.waitForExistence(timeout: 3))
        orderCopyBtn.tap()
        XCTAssertTrue(app.navigationBars["Print Checkout"].waitForExistence(timeout: 4))

        let confirmOrderBtn = app.buttons["Confirm & Place Print Order"].firstMatch
        if !confirmOrderBtn.waitForExistence(timeout: 2) {
            app.swipeUp()
        }
        XCTAssertTrue(confirmOrderBtn.waitForExistence(timeout: 4) && confirmOrderBtn.isEnabled)
        confirmOrderBtn.tap()

        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Print order #'")).firstMatch.waitForExistence(timeout: 8))
        app.buttons["Close"].firstMatch.tap()

        // 8. Open Print Orders -> OrderDetailTimelineSheet -> Reorder
        let printOrdersBtn = app.buttons["Print Orders"].firstMatch
        XCTAssertTrue(printOrdersBtn.waitForExistence(timeout: 4))
        printOrdersBtn.tap()
        XCTAssertTrue(app.navigationBars["Print & Orders"].waitForExistence(timeout: 4))

        let placedOrderRow = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Track & Reorder'")).firstMatch
        if !placedOrderRow.waitForExistence(timeout: 3) {
            app.swipeUp()
        }
        XCTAssertTrue(placedOrderRow.waitForExistence(timeout: 8), "Live order must appear in Print & Orders list")
        placedOrderRow.tap()
        XCTAssertTrue(app.navigationBars["Order Timeline"].waitForExistence(timeout: 4))
        XCTAssertTrue(app.staticTexts["Submitted"].waitForExistence(timeout: 4))

        let reorderBtn = app.buttons["Reorder This Edition"].firstMatch
        if !reorderBtn.waitForExistence(timeout: 2) {
            app.swipeUp()
        }
        XCTAssertTrue(reorderBtn.waitForExistence(timeout: 4))
        reorderBtn.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Reordered edition as #'")).firstMatch.waitForExistence(timeout: 8))
        app.buttons["Close"].firstMatch.tap()
    }
}
