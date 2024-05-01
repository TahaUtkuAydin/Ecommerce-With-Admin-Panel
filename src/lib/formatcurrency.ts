export function CurrencyFormatter (currency) {
    return currency.toLocaleString("en-US",{
        currency:"USD",
        style:"currency"
    })
}