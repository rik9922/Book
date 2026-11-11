import SwiftUI

public enum AuthFlowMode: String, CaseIterable, Identifiable {
    case signIn = "Sign In"
    case register = "Register"
    case recover = "Recover"
    case verify = "Verify OTP"
    case invite = "Accept Invite"

    public var id: String { rawValue }
}

public struct AuthSheetView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var mode: AuthFlowMode = .signIn
    @State private var fullName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var verificationCode = ""
    @State private var inviteToken = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var statusMessage: String?
    @State private var hasSessionToken = false

    public var onAuthenticated: ((AuthSessionDTO) -> Void)?

    public init(initialMode: AuthFlowMode = .signIn, onAuthenticated: ((AuthSessionDTO) -> Void)? = nil) {
        self._mode = State(initialValue: initialMode)
        self.onAuthenticated = onAuthenticated
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Access Mode", selection: $mode) {
                        ForEach(AuthFlowMode.allCases) { item in
                            Text(item.rawValue).tag(item)
                        }
                    }
                    #if os(iOS)
                    .pickerStyle(.menu)
                    #endif
                }

                switch mode {
                case .signIn, .register:
                    Section("Archival Credentials") {
                        if mode == .register {
                            TextField("Full Name", text: $fullName)
                        }
                        TextField("Email Address", text: $email)
                        #if os(iOS)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                        #endif
                            .autocorrectionDisabled()
                        SecureField("Password (min 8 chars)", text: $password)
                    }

                case .recover:
                    Section("Vault Recovery (IOS-04)") {
                        Text("Enter the email linked to your archival vault to receive a time-limited reset token.")
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                        TextField("Email Address", text: $email)
                        #if os(iOS)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                        #endif
                            .autocorrectionDisabled()
                    }

                case .verify:
                    Section("Email Verification (IOS-05)") {
                        Text("Enter your 6-digit verification code or archival verification token.")
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                        TextField("6-Digit Code or Token", text: $verificationCode)
                        #if os(iOS)
                            .textInputAutocapitalization(.never)
                        #endif
                            .autocorrectionDisabled()
                    }

                case .invite:
                    Section("Family Circle Invitation (IOS-06)") {
                        Text("Paste a circle invitation token shared by a Space Steward.")
                            .font(.caption)
                            .foregroundStyle(MemoriaTheme.textSecondary)
                        TextField("Invitation Token", text: $inviteToken)
                        #if os(iOS)
                            .textInputAutocapitalization(.never)
                        #endif
                            .autocorrectionDisabled()
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(Color.red)
                    }
                }

                if let statusMessage {
                    Section {
                        Text(statusMessage)
                            .font(.footnote)
                            .foregroundStyle(MemoriaTheme.sageFunc)
                    }
                }

                Section {
                    Button {
                        Task { await submit() }
                    } label: {
                        HStack {
                            Spacer()
                            if isSubmitting {
                                ProgressView()
                            } else {
                                Text(primaryButtonTitle)
                                    .fontWeight(.semibold)
                            }
                            Spacer()
                        }
                    }
                    .disabled(isPrimaryDisabled)
                }

                if hasSessionToken {
                    Section("Active Device Keychain Session") {
                        Button("Sign Out & Clear Keychain", role: .destructive) {
                            Task {
                                await MemoriaAPIClient.shared.logout()
                                hasSessionToken = false
                                statusMessage = "Signed out of Keychain session."
                            }
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(MemoriaTheme.canvas)
            .navigationTitle("Memoria Access")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task {
                hasSessionToken = await MemoriaAPIClient.shared.getAuthToken() != nil
            }
        }
    }

    private var primaryButtonTitle: String {
        switch mode {
        case .signIn: return "Sign In to Vault"
        case .register: return "Create Archival Account"
        case .recover: return "Send Reset Instructions"
        case .verify: return "Verify Email Code"
        case .invite: return "Accept Circle Invitation"
        }
    }

    private var isPrimaryDisabled: Bool {
        if isSubmitting { return true }
        switch mode {
        case .signIn:
            return email.trimmingCharacters(in: .whitespaces).isEmpty || password.count < 8
        case .register:
            return fullName.trimmingCharacters(in: .whitespaces).isEmpty || email.trimmingCharacters(in: .whitespaces).isEmpty || password.count < 8
        case .recover:
            return email.trimmingCharacters(in: .whitespaces).isEmpty
        case .verify:
            return verificationCode.trimmingCharacters(in: .whitespaces).count < 6
        case .invite:
            return inviteToken.trimmingCharacters(in: .whitespaces).isEmpty
        }
    }

    private func submit() async {
        isSubmitting = true
        errorMessage = nil
        statusMessage = nil
        do {
            switch mode {
            case .signIn:
                let session = try await MemoriaAPIClient.shared.login(
                    email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                    password: password
                )
                hasSessionToken = true
                statusMessage = "Authenticated as \(session.user.fullName)"
                onAuthenticated?(session)
                dismiss()
            case .register:
                let session = try await MemoriaAPIClient.shared.register(
                    email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                    password: password,
                    fullName: fullName.trimmingCharacters(in: .whitespacesAndNewlines)
                )
                hasSessionToken = true
                statusMessage = "Authenticated as \(session.user.fullName)"
                onAuthenticated?(session)
                dismiss()
            case .recover:
                try await MemoriaAPIClient.shared.forgotPassword(
                    email: email.trimmingCharacters(in: .whitespacesAndNewlines)
                )
                statusMessage = "If an archival vault exists for that email, recovery instructions have been queued."
            case .verify:
                try await MemoriaAPIClient.shared.verifyEmailCode(
                    tokenOrCode: verificationCode.trimmingCharacters(in: .whitespacesAndNewlines)
                )
                statusMessage = "Vault email verified."
            case .invite:
                try await MemoriaAPIClient.shared.acceptInvitation(
                    token: inviteToken.trimmingCharacters(in: .whitespacesAndNewlines)
                )
                statusMessage = "Circle invitation accepted! Refresh Circles to view your new vault."
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isSubmitting = false
    }
}
