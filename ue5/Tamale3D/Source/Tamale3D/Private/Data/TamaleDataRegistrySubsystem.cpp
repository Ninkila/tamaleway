#include "Data/TamaleDataRegistrySubsystem.h"

#include "JsonObjectConverter.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Tamale3D.h"

namespace TamaleData
{
    static FString TableDirectory()
    {
        return FPaths::Combine(FPaths::ProjectContentDir(), TEXT("DataTables"));
    }

    /** Reads one exported JSON table (an array of row objects) into OutRows. */
    template <typename RowType>
    static bool LoadTable(const TCHAR* FileName, TArray<RowType>& OutRows, TArray<FString>& OutIssues)
    {
        OutRows.Reset();
        const FString Path = FPaths::Combine(TableDirectory(), FileName);

        FString Json;
        if (!FFileHelper::LoadFileToString(Json, *Path))
        {
            OutIssues.Add(FString::Printf(TEXT("%s: file not found at %s"), FileName, *Path));
            return false;
        }
        if (!FJsonObjectConverter::JsonArrayStringToUStruct(Json, &OutRows))
        {
            OutIssues.Add(FString::Printf(TEXT("%s: could not be parsed into %s"), FileName, *RowType::StaticStruct()->GetName()));
            OutRows.Reset();
            return false;
        }
        if (OutRows.Num() == 0)
        {
            OutIssues.Add(FString::Printf(TEXT("%s: contains no rows"), FileName));
            return false;
        }
        return true;
    }

    /** Reports duplicate IDs within one table. */
    template <typename RowType>
    static void CheckUniqueIds(const TCHAR* TableName, const TArray<RowType>& Rows, FString RowType::* IdMember, TArray<FString>& OutIssues)
    {
        TSet<FString> Seen;
        for (const RowType& Row : Rows)
        {
            const FString& Id = Row.*IdMember;
            if (Id.IsEmpty())
            {
                OutIssues.Add(FString::Printf(TEXT("%s: row with empty id"), TableName));
            }
            else if (Seen.Contains(Id))
            {
                OutIssues.Add(FString::Printf(TEXT("%s: duplicate id '%s'"), TableName, *Id));
            }
            Seen.Add(Id);
        }
    }
}

void UTamaleDataRegistrySubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    ReloadAllTables();
}

bool UTamaleDataRegistrySubsystem::ReloadAllTables()
{
    using namespace TamaleData;

    ValidationIssues.Reset();
    TArray<FString> LoadIssues;
    int32 Loaded = 0;

    Loaded += LoadTable(TEXT("DT_TamaleRoads.json"), Roads, LoadIssues) ? 1 : 0;
    Loaded += LoadTable(TEXT("DT_TamaleLandmarks.json"), Landmarks, LoadIssues) ? 1 : 0;
    Loaded += LoadTable(TEXT("DT_TamaleDistricts.json"), Districts, LoadIssues) ? 1 : 0;
    Loaded += LoadTable(TEXT("DT_PlayableCharacters.json"), PlayableCharacters, LoadIssues) ? 1 : 0;
    Loaded += LoadTable(TEXT("DT_TamaleNPCs.json"), Npcs, LoadIssues) ? 1 : 0;
    Loaded += LoadTable(TEXT("DT_TamaleShops.json"), Shops, LoadIssues) ? 1 : 0;
    Loaded += LoadTable(TEXT("DT_HomeRecipes.json"), Recipes, LoadIssues) ? 1 : 0;
    Loaded += LoadTable(TEXT("DT_HomeIngredients.json"), Ingredients, LoadIssues) ? 1 : 0;
    Loaded += LoadTable(TEXT("DT_HomeUpgrades.json"), HomeUpgrades, LoadIssues) ? 1 : 0;
    Loaded += LoadTable(TEXT("DT_DagbaniTerms.json"), DagbaniTerms, LoadIssues) ? 1 : 0;
    Loaded += LoadTable(TEXT("DT_TamaleEvents.json"), Events, LoadIssues) ? 1 : 0;
    Loaded += LoadTable(TEXT("DT_MusicTracks.json"), MusicTracks, LoadIssues) ? 1 : 0;
    Loaded += LoadTable(TEXT("DT_TamaleBuildings.json"), Buildings, LoadIssues) ? 1 : 0;

    constexpr int32 ExpectedTables = 13;
    LoadedTableCount = Loaded;
    for (const FString& Issue : LoadIssues)
    {
        AddIssue(Issue);
    }

    ValidateLoadedData();

    UE_LOG(LogTamale3D, Log, TEXT("Tamale data registry: %d/%d tables loaded from %s | roads=%d landmarks=%d buildings=%d npcs=%d shops=%d | road networks=%d | issues=%d"),
        Loaded, ExpectedTables, *TableDirectory(), Roads.Num(), Landmarks.Num(), Buildings.Num(), Npcs.Num(), Shops.Num(),
        RoadNetworkComponentCount, ValidationIssues.Num());

    return Loaded == ExpectedTables;
}

void UTamaleDataRegistrySubsystem::AddIssue(const FString& Issue)
{
    ValidationIssues.Add(Issue);
    UE_LOG(LogTamale3D, Warning, TEXT("[DataValidation] %s"), *Issue);
}

void UTamaleDataRegistrySubsystem::ValidateLoadedData()
{
    using namespace TamaleData;
    TArray<FString> Issues;

    CheckUniqueIds(TEXT("Roads"), Roads, &FTamaleRoadRow::RoadId, Issues);
    CheckUniqueIds(TEXT("Landmarks"), Landmarks, &FTamaleLandmarkRow::LandmarkId, Issues);
    CheckUniqueIds(TEXT("Districts"), Districts, &FTamaleDistrictRow::DistrictId, Issues);
    CheckUniqueIds(TEXT("PlayableCharacters"), PlayableCharacters, &FTamalePlayableCharacterRow::CharacterId, Issues);
    CheckUniqueIds(TEXT("NPCs"), Npcs, &FTamaleNpcRow::NpcId, Issues);
    CheckUniqueIds(TEXT("Shops"), Shops, &FTamaleShopRow::ShopId, Issues);
    CheckUniqueIds(TEXT("Buildings"), Buildings, &FTamaleBuildingRow::BuildingId, Issues);

    // Cross-references
    TSet<FString> ShopIds;
    for (const FTamaleShopRow& S : Shops) ShopIds.Add(S.ShopId);
    TSet<FString> LandmarkIds;
    for (const FTamaleLandmarkRow& L : Landmarks) LandmarkIds.Add(L.LandmarkId);

    for (const FTamaleLandmarkRow& L : Landmarks)
    {
        if (!L.ShopId.IsEmpty() && !ShopIds.Contains(L.ShopId))
            Issues.Add(FString::Printf(TEXT("Landmark '%s' references unknown shop '%s'"), *L.LandmarkId, *L.ShopId));
    }
    for (const FTamaleNpcRow& N : Npcs)
    {
        if (!N.ShopId.IsEmpty() && !ShopIds.Contains(N.ShopId))
            Issues.Add(FString::Printf(TEXT("NPC '%s' references unknown shop '%s'"), *N.NpcId, *N.ShopId));
    }
    for (const FTamaleEventRow& E : Events)
    {
        if (!E.LandmarkId.IsEmpty() && !LandmarkIds.Contains(E.LandmarkId))
            Issues.Add(FString::Printf(TEXT("Event '%s' references unknown landmark '%s'"), *E.EventId, *E.LandmarkId));
    }
    for (const FTamalePlayableCharacterRow& C : PlayableCharacters)
    {
        if (!LandmarkIds.Contains(C.HomeLandmarkId))
            Issues.Add(FString::Printf(TEXT("Character '%s' home landmark '%s' does not exist"), *C.CharacterId, *C.HomeLandmarkId));
    }

    // Road sanity + connectivity (rectangles that touch within 50 cm are connected)
    for (const FTamaleRoadRow& R : Roads)
    {
        if (R.WidthCm < 300.0f || R.WidthCm > 3000.0f || R.LengthCm < R.WidthCm)
            Issues.Add(FString::Printf(TEXT("Road '%s' has implausible size (width %.0f cm, length %.0f cm)"), *R.RoadId, R.WidthCm, R.LengthCm));
    }

    const int32 N = Roads.Num();
    TArray<int32> Parent;
    Parent.SetNumUninitialized(N);
    for (int32 i = 0; i < N; ++i) Parent[i] = i;
    auto Find = [&Parent](int32 i)
    {
        while (Parent[i] != i) { Parent[i] = Parent[Parent[i]]; i = Parent[i]; }
        return i;
    };
    for (int32 i = 0; i < N; ++i)
    {
        const FBox2D A = Roads[i].GetFootprint2D().ExpandBy(25.0);
        for (int32 j = i + 1; j < N; ++j)
        {
            if (A.Intersect(Roads[j].GetFootprint2D().ExpandBy(25.0)))
            {
                Parent[Find(i)] = Find(j);
            }
        }
    }
    TSet<int32> Roots;
    for (int32 i = 0; i < N; ++i) Roots.Add(Find(i));
    RoadNetworkComponentCount = Roots.Num();
    if (RoadNetworkComponentCount > 1)
    {
        Issues.Add(FString::Printf(TEXT("Road network is split into %d disconnected parts"), RoadNetworkComponentCount));
    }

    for (const FString& Issue : Issues)
    {
        AddIssue(Issue);
    }
}

const FTamaleLandmarkRow* UTamaleDataRegistrySubsystem::FindLandmark(const FString& LandmarkId) const
{
    return Landmarks.FindByPredicate([&LandmarkId](const FTamaleLandmarkRow& Row) { return Row.LandmarkId == LandmarkId; });
}

const FTamalePlayableCharacterRow* UTamaleDataRegistrySubsystem::FindPlayableCharacter(const FString& CharacterId) const
{
    return PlayableCharacters.FindByPredicate([&CharacterId](const FTamalePlayableCharacterRow& Row) { return Row.CharacterId == CharacterId; });
}

bool UTamaleDataRegistrySubsystem::GetLandmark(const FString& LandmarkId, FTamaleLandmarkRow& OutRow) const
{
    if (const FTamaleLandmarkRow* Found = FindLandmark(LandmarkId))
    {
        OutRow = *Found;
        return true;
    }
    return false;
}

bool UTamaleDataRegistrySubsystem::GetPlayableCharacter(const FString& CharacterId, FTamalePlayableCharacterRow& OutRow) const
{
    if (const FTamalePlayableCharacterRow* Found = FindPlayableCharacter(CharacterId))
    {
        OutRow = *Found;
        return true;
    }
    return false;
}

FString UTamaleDataRegistrySubsystem::FindDistrictNameAt(const FVector& WorldLocation) const
{
    const FTamaleDistrictRow* Best = nullptr;
    double BestScore = TNumericLimits<double>::Max();
    for (const FTamaleDistrictRow& D : Districts)
    {
        const double Dist = FVector2D::Distance(FVector2D(WorldLocation), FVector2D(D.CenterLocationCm));
        // Prefer districts the point is inside of; among those, the closest centre.
        const double Score = Dist / FMath::Max(1.0, static_cast<double>(D.RadiusCm));
        if (Score < BestScore)
        {
            BestScore = Score;
            Best = &D;
        }
    }
    return Best ? Best->DisplayName : FString(TEXT("Tamale"));
}

bool UTamaleDataRegistrySubsystem::OverlapsAnyRoad(const FBox2D& Box) const
{
    for (const FTamaleRoadRow& R : Roads)
    {
        if (Box.Intersect(R.GetFootprint2D()))
        {
            return true;
        }
    }
    return false;
}

FBox2D UTamaleDataRegistrySubsystem::GetWorldBounds2D() const
{
    FBox2D Bounds(ForceInit);
    for (const FTamaleRoadRow& R : Roads)
    {
        Bounds += R.GetFootprint2D();
    }
    for (const FTamaleBuildingRow& B : Buildings)
    {
        const FVector2D Half(B.SizeCm.X * 0.5, B.SizeCm.Y * 0.5);
        const double Radius = Half.Size();
        Bounds += FBox2D(FVector2D(B.CenterLocationCm) - FVector2D(Radius), FVector2D(B.CenterLocationCm) + FVector2D(Radius));
    }
    for (const FTamaleLandmarkRow& L : Landmarks)
    {
        Bounds += FVector2D(L.LocationCm);
    }
    if (!Bounds.bIsValid)
    {
        Bounds = FBox2D(FVector2D(-10000.0), FVector2D(10000.0));
    }
    return Bounds;
}
