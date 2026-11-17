import { prerender } from "react-dom/static";
import { StaticRouter } from "react-router-dom";
import App from "./App";
import { AppProviders } from "./AppProviders";

/**
 * Build-time render of a public route to HTML, waiting for its lazy page to load.
 * The homepage and public policies are rendered; account and exam URLs never are.
 */
export async function render(url: string): Promise<string> {
    const { prelude } = await prerender(
        <AppProviders>
            <StaticRouter location={url}>
                <App />
            </StaticRouter>
        </AppProviders>,
    );
    return new Response(prelude).text();
}
