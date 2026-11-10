import SwiftUI

public struct AuthSheetView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var isRegisterMode = false
    @State private var fullName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var statusMessage: String?
    @State private var hasSessionToken = false

    public var onAuthenticated: ((AuthSessionDTO) -> Void)?

    public init(onAuthenticated: ((AuthSessionDTO) -> Void)? = nil) {
        self.onAuthenticated = onAuthenticated
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Mode", selection: $isRegisterMode) {
                        Text("Sign In").tag(false)
                        Text("Create Account").tag(true)
                    }
                    .pickerStyle(.segmented)
                }

                Section("Archival Credentials") {
                    if isRegisterMode {
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
                                Text(isRegisterMode ? "Create Archival Account" : "Sign In to Vault")
                                    .fontWeight(.semibold)
                            }
                            Spacer()
                        }
                    }
                    .disabled(isSubmitting || email.isEmpty || password.count < 8 || (isRegisterMode && fullName.isEmpty))
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

    private func submit() async {
        isSubmitting = true
        errorMessage = nil
        statusMessage = nil
        do {
            let session: AuthSessionDTO
            if isRegisterMode {
                session = try await MemoriaAPIClient.shared.register(
                    email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                    password: password,
                    fullName: fullName.trimmingCharacters(in: .whitespacesAndNewlines)
                )
            } else {
                session = try await MemoriaAPIClient.shared.login(
                    email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                    password: password
                )
            }
            hasSessionToken = true
            statusMessage = "Authenticated as \(session.user.fullName)"
            onAuthenticated?(session)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSubmitting = false
    }
}
