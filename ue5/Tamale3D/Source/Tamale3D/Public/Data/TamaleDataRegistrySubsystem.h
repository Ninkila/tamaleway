#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "Data/TamaleWorldTypes.h"
#include "TamaleDataRegistrySubsystem.generated.h"

/**
 * Loads the exported TAMALE 3D world data (Content/DataTables/*.json) at runtime into typed
 * arrays, so gameplay works straight from the exporter output without hand-importing
 * DataTable assets in the editor. Also validates IDs, cross-references and road connectivity
 * and logs every problem to LogTamale3D.
 *
 * The same JSON can still be imported as DataTable assets (struct = the F*Row types) for
 * designers; this subsystem is the source of truth for C++ systems.
 */
UCLASS()
class TAMALE3D_API UTamaleDataRegistrySubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    /** Re-reads every table from disk and re-runs validation. Returns true when all tables loaded. */
    UFUNCTION(BlueprintCallable, Category = "Tamale|Data")
    bool ReloadAllTables();

    UPROPERTY(BlueprintReadOnly, Category = "Tamale|Data") TArray<FTamaleRoadRow> Roads;
    UPROPERTY(BlueprintReadOnly, Category = "Tamale|Data") TArray<FTamaleLandmarkRow> Landmarks;
    UPROPERTY(BlueprintReadOnly, Category = "Tamale|Data") TArray<FTamaleDistrictRow> Districts;
    UPROPERTY(BlueprintReadOnly, Category = "Tamale|Data") TArray<FTamalePlayableCharacterRow> PlayableCharacters;
    UPROPERTY(BlueprintReadOnly, Category = "Tamale|Data") TArray<FTamaleNpcRow> Npcs;
    UPROPERTY(BlueprintReadOnly, Category = "Tamale|Data") TArray<FTamaleShopRow> Shops;
    UPROPERTY(BlueprintReadOnly, Category = "Tamale|Data") TArray<FTamaleRecipeRow> Recipes;
    UPROPERTY(BlueprintReadOnly, Category = "Tamale|Data") TArray<FTamaleIngredientRow> Ingredients;
    UPROPERTY(BlueprintReadOnly, Category = "Tamale|Data") TArray<FTamaleHomeUpgradeRow> HomeUpgrades;
    UPROPERTY(BlueprintReadOnly, Category = "Tamale|Data") TArray<FTamaleDagbaniTermRow> DagbaniTerms;
    UPROPERTY(BlueprintReadOnly, Category = "Tamale|Data") TArray<FTamaleEventRow> Events;
    UPROPERTY(BlueprintReadOnly, Category = "Tamale|Data") TArray<FTamaleMusicTrackRow> MusicTracks;
    UPROPERTY(BlueprintReadOnly, Category = "Tamale|Data") TArray<FTamaleBuildingRow> Buildings;

    /** Human-readable problems found while loading/validating (also logged). Empty == clean. */
    UPROPERTY(BlueprintReadOnly, Category = "Tamale|Data") TArray<FString> ValidationIssues;

    UPROPERTY(BlueprintReadOnly, Category = "Tamale|Data") int32 LoadedTableCount = 0;

    /** Number of separate road networks (1 == every road reachable from every other). */
    UPROPERTY(BlueprintReadOnly, Category = "Tamale|Data") int32 RoadNetworkComponentCount = 0;

    UFUNCTION(BlueprintPure, Category = "Tamale|Data")
    bool IsDataLoaded() const { return LoadedTableCount > 0; }

    UFUNCTION(BlueprintCallable, Category = "Tamale|Data")
    bool GetLandmark(const FString& LandmarkId, FTamaleLandmarkRow& OutRow) const;

    UFUNCTION(BlueprintCallable, Category = "Tamale|Data")
    bool GetPlayableCharacter(const FString& CharacterId, FTamalePlayableCharacterRow& OutRow) const;

    /** Name of the district whose centre is nearest to the location (within its radius when possible). */
    UFUNCTION(BlueprintPure, Category = "Tamale|Data")
    FString FindDistrictNameAt(const FVector& WorldLocation) const;

    /** True when the 2D box overlaps any road carriageway. */
    bool OverlapsAnyRoad(const FBox2D& Box) const;

    /** Bounding rectangle of every road, building and landmark (used for the ground plane and map). */
    FBox2D GetWorldBounds2D() const;

    const FTamaleLandmarkRow* FindLandmark(const FString& LandmarkId) const;
    const FTamalePlayableCharacterRow* FindPlayableCharacter(const FString& CharacterId) const;

private:
    void ValidateLoadedData();
    void AddIssue(const FString& Issue);
};
