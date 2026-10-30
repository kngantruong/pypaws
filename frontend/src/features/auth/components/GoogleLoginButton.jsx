function GoogleLoginButton({
  onClick,
  children = 'Tiếp tục với Google',
}) {
  return (
    <button
      type="button"
      className="auth-google-button"
      onClick={onClick}
    >
      <span className="auth-google-icon" aria-hidden="true">
        G
      </span>

      {children}
    </button>
  )
}

export default GoogleLoginButton