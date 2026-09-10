export function work(collectionApi)
{
  return collectionApi.getFilteredByTag("workRole").sort((firstPosition, secondPosition) =>
  {
    return firstPosition.data.startDate - secondPosition.data.startDate;
  });
}
