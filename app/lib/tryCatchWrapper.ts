export const tryCatchWrapper = async <T>(
  operation: () => Promise<T>,
  errorMessage: string = "An unexpected error occurred",
) => {
  try {
    return await operation();
  } catch (error: any) {
    import.meta.env.DEV && console.error(error, "Wrapper caught error");
    return Response.json(
      {
        success: false,
        message: error.message || errorMessage,
        body: null,
      },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
